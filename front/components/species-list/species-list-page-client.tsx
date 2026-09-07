'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GoatPipelineTracker } from '@/components/status/goat-pipeline-tracker'
import { SpeciesExportSheet } from '@/components/species-export-sheet'
import { SpeciesCard } from '@/components/species-card'
import { SpeciesListActiveFilters } from '@/components/species-list/species-list-active-filters'
import { SpeciesListFacetStatsSync } from '@/components/species-list/species-list-facet-stats-sync'
import {
   SpeciesListFiltersPanel,
   type SpeciesListFiltersPanelProps,
} from '@/components/species-list/species-list-filter-sidebar'
import { SpeciesListFilterAccordionProvider } from '@/components/species-list/species-list-filter-accordion-context'
import { SpeciesListGridSkeleton } from '@/components/species-list/species-list-grid-skeleton'
import { SpeciesListResultsSummary } from '@/components/species-list/species-list-results-bar'
import {
   emptyRankTaxonCache,
   mapTaxonRow,
   type RankTaxonCache,
} from '@/components/species-list/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import type { TaxonRecord } from '@/lib/api/taxon'
import { downloadGoatReport } from '@/lib/api/goatReport'
import { fetchOrganisms } from '@/lib/api/organisms'
import { fetchFieldStats } from '@/lib/api/stats'
import { fetchTaxons } from '@/lib/api/taxons'
import {
   IUCN_LABELS,
   IUCN_STATS_NO_ENTRY,
   sortIucnThreatStatEntries,
} from '@/lib/iucnCategory'
import { countryLabelEn } from '@/lib/countryLabels'
import { buildGoatTrackerStages } from '@/lib/goatPipelineTracker'
import {
   GOAT_PIPELINE_STEPS,
   labelGoatStatus,
} from '@/lib/organismStatusLabels'
import { navRouteIcons } from '@/lib/portal'
import {
   GOAT_PUBLIC_INFO_URL,
   parseGoatProjectLink,
   showCmsLoginNav,
   showCountriesUi,
   showGoatStatusPage,
} from '@/lib/portal/portalFeatures'
import {
   isSpeciesMetadataEmptyBucketKey,
   sortStatEntriesByCountDesc,
   speciesMetadataBucketToQueryValue,
} from '@/lib/speciesFieldStats'
import { appendCustomFieldListFilters } from '@/lib/speciesCustomFieldFilters'
import { useOrganismCountriesDisplayStore } from '@/stores/organism-countries-display-store'
import {
   resolveSpeciesSortMode,
   SPECIES_SORT_UNSET,
   speciesSortToApi,
   visibleSpeciesSortModes,
   type SpeciesSortSelection,
} from '@/lib/speciesListSort'
import { useMinWidthLg } from '@/hooks/use-min-width-lg'
import { useRootTaxonStore } from '@/stores/root-taxon-store'
import {
   buildOrganismStatsQuery,
   organismStatsCacheKey,
} from '@/lib/speciesListOrganismStatsQuery'
import {
   normalizeRankStats,
   rankGroupHasData,
   rankGroupIdFromApiRank,
   SPECIES_RANK_GROUPS,
   TAXONOMY_EXPLORER_TREE_MODE_ID,
} from '@/lib/taxonRankFilter'
import { cn } from '@/lib/utils'
import { Download, ExternalLink, Filter, Loader2 } from 'lucide-react'
import { useTheme } from 'next-themes'

const PAGE_SIZE = 21
const TAXON_PAGE_SIZE = 50
const GOAT_STATS_FIELD = 'goat_status'
const TARGET_LIST_STATS_FIELD = 'target_list_status'

export function SpeciesListPageClient() {
   const { t } = useLocale()
   const { config } = usePortalConfig()
   const cmsEnabled = showCmsLoginNav(config)
   const customFields = config?.organismCustomFields ?? []
   const goatEnabled = showGoatStatusPage(config)
   const countriesEnabled = showCountriesUi(config)
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
   const [subProjectFilter, setSubProjectFilter] = useState<string>('all')
   const [subProjectStats, setSubProjectStats] = useState<Record<string, number> | null>(null)
   const [customFieldFilters, setCustomFieldFilters] = useState<Record<string, string>>({})
   const [customFieldStats, setCustomFieldStatsState] = useState<Record<string, Record<string, number>>>({})
   const [selectedCountryCodes, setSelectedCountryCodes] = useState<string[]>([])
   const [sortMode, setSortMode] = useState<SpeciesSortSelection>(SPECIES_SORT_UNSET)
   const [exportSheetOpen, setExportSheetOpen] = useState(false)
   const [filtersOpen, setFiltersOpen] = useState(false)

   const [goatStatusFilters, setGoatStatusFilters] = useState<string[]>([])
   const [goatStats, setGoatStats] = useState<Record<string, number> | null>(null)
   const [targetListStats, setTargetListStats] = useState<Record<string, number> | null>(null)
   const [goatReportLoading, setGoatReportLoading] = useState(false)
   const [goatReportError, setGoatReportError] = useState<string | null>(null)
   const [goatDrawerOpen, setGoatDrawerOpen] = useState(false)

   const isLg = useMinWidthLg()
   const { resolvedTheme } = useTheme()
   const goatStatusButtonIconSrc = useMemo(() => {
      const bp = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '')
      const path = resolvedTheme === 'dark' ? '/goat-icon-light.svg' : '/goat-icon-dark.svg'
      return bp ? `${bp}${path}` : path
   }, [resolvedTheme])

   const goatProjectHref = useMemo(
      () => parseGoatProjectLink(config?.general.goatProjectLink),
      [config?.general],
   )

   const [items, setItems] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(true)
   const [loadingMore, setLoadingMore] = useState(false)
   const [error, setError] = useState<string | null>(null)

   const [rankStats, setRankStats] = useState<Record<string, number> | null>(null)
   const [selectedTaxonRankId, setSelectedTaxonRankId] = useState<string | null>(null)
   const [selectedTaxonTaxid, setSelectedTaxonTaxid] = useState<string | null>(null)
   const [lineageDisplayName, setLineageDisplayName] = useState<string | null>(null)
   const [taxonByRank, setTaxonByRank] = useState<Record<string, RankTaxonCache>>({})
   const taxonByRankRef = useRef<Record<string, RankTaxonCache>>({})
   taxonByRankRef.current = taxonByRank
   const fetchSeqByRankRef = useRef<Record<string, number>>({})
   const [explorerRankId, setExplorerRankId] = useState<string>(TAXONOMY_EXPLORER_TREE_MODE_ID)
   const organismStatsCacheRef = useRef(new Map<string, Record<string, number>>())

   const setCustomFieldStats = useCallback((key: string, stats: Record<string, number>) => {
      setCustomFieldStatsState((prev) => ({ ...prev, [key]: stats }))
   }, [])

   const setCustomFieldFilter = useCallback((key: string, value: string) => {
      setCustomFieldFilters((prev) => ({ ...prev, [key]: value }))
   }, [])

   useEffect(() => {
      let cancelled = false
      void fetchFieldStats('taxons', 'rank', {})
         .then((raw) => {
            if (!cancelled) setRankStats(normalizeRankStats(raw))
         })
         .catch(() => {
            if (!cancelled) setRankStats({})
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
         setSubProjectFilter('all')
         setCustomFieldFilters({})
         setSelectedCountryCodes([])
         setGoatStatusFilters([])
      }
   }, [selectedTaxonTaxid])

   const stageOrder = useMemo(
      () => new Map(GOAT_PIPELINE_STEPS.map((s, i) => [s.value, i] as const)),
      [],
   )

   const toggleGoatStatusFilter = useCallback(
      (key: string) => {
         setGoatStatusFilters((prev) => {
            if (prev.includes(key)) return prev.filter((k) => k !== key)
            const next = [...prev, key]
            return next.sort((a, b) => (stageOrder.get(a) ?? 0) - (stageOrder.get(b) ?? 0))
         })
      },
      [stageOrder],
   )

   const loadRootTaxon = useRootTaxonStore((s) => s.loadRootTaxon)
   const rootTaxon = useRootTaxonStore((s) => s.rootTaxon)

   useEffect(() => {
      void loadRootTaxon()
   }, [loadRootTaxon])

   const iucnThreatSelectOptions = useMemo(
      () => sortIucnThreatStatEntries(Object.entries(iucnThreatStats ?? {})),
      [iucnThreatStats],
   )

   const subProjectOptions = useMemo(
      () => sortStatEntriesByCountDesc(Object.entries(subProjectStats ?? {})),
      [subProjectStats],
   )

   const iucnFilterVisible = true
   const subProjectFilterVisible = cmsEnabled && customFields.length === 0
   const customFieldsFilterVisible = cmsEnabled && customFields.length > 0
   const countryFrequencyStats = useOrganismCountriesDisplayStore((s) =>
      countriesEnabled ? s.countryFrequencyStats : null,
   )
   const countryFilterSectionVisible = countriesEnabled

   const effectiveIucnThreatFilter = iucnThreatFilter
   const effectiveSubProjectFilter = subProjectFilter

   const statsQueryBase = useMemo(
      () => ({
         taxon_lineage: selectedTaxonTaxid ?? undefined,
         filter: debouncedSearch,
         iucnThreatFilter: effectiveIucnThreatFilter,
         subProjectFilter: effectiveSubProjectFilter,
         selectedCountryCodes,
         goatStatusFilters: goatEnabled ? goatStatusFilters : [],
         targetListFilter: 'all' as const,
         customFieldFilters,
         customFields,
      }),
      [
         selectedTaxonTaxid,
         debouncedSearch,
         effectiveIucnThreatFilter,
         effectiveSubProjectFilter,
         selectedCountryCodes,
         goatEnabled,
         goatStatusFilters,
         customFieldFilters,
         customFields,
      ],
   )

   const ensureGoatStats = useCallback(() => {
      if (!goatEnabled) return
      const q = buildOrganismStatsQuery(statsQueryBase, 'goat_status')
      const key = organismStatsCacheKey('organisms', GOAT_STATS_FIELD, q)
      const hit = organismStatsCacheRef.current.get(key)
      if (hit) {
         setGoatStats(hit)
         return
      }
      void fetchFieldStats('organisms', GOAT_STATS_FIELD, q)
         .then((raw) => {
            organismStatsCacheRef.current.set(key, raw)
            setGoatStats(raw)
         })
         .catch(() => setGoatStats({}))
   }, [statsQueryBase, goatEnabled])

   const ensureTargetListStats = useCallback(() => {
      if (!goatEnabled) return
      const q = buildOrganismStatsQuery(statsQueryBase, 'target_list_status')
      const key = organismStatsCacheKey('organisms', TARGET_LIST_STATS_FIELD, q)
      const hit = organismStatsCacheRef.current.get(key)
      if (hit) {
         setTargetListStats(hit)
         return
      }
      void fetchFieldStats('organisms', TARGET_LIST_STATS_FIELD, q)
         .then((raw) => {
            organismStatsCacheRef.current.set(key, raw)
            setTargetListStats(raw)
         })
         .catch(() => setTargetListStats({}))
   }, [statsQueryBase, goatEnabled])

   /** GoaT drawer shows pipeline totals without opening the sidebar GoaT sections. */
   useEffect(() => {
      if (!goatEnabled || !goatDrawerOpen) return
      ensureGoatStats()
      ensureTargetListStats()
   }, [goatEnabled, goatDrawerOpen, statsQueryBase, ensureGoatStats, ensureTargetListStats])

   useEffect(() => {
      if (isLg) setFiltersOpen(false)
   }, [isLg])

   const toggleCountryCode = useCallback((code: string) => {
      const c = code.trim().toUpperCase()
      if (!c) return
      setSelectedCountryCodes((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]))
   }, [])

   const clearCountrySelection = useCallback(() => {
      setSelectedCountryCodes([])
   }, [])

   const visibleSortModes = useMemo(() => visibleSpeciesSortModes(rootTaxon), [rootTaxon])

   const listRefreshing = loading && items.length > 0

   const mainScrollRef = useRef<HTMLDivElement>(null)
   const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

   useEffect(() => {
      if (sortMode !== SPECIES_SORT_UNSET && !visibleSortModes.includes(sortMode)) {
         setSortMode(SPECIES_SORT_UNSET)
      }
   }, [visibleSortModes, sortMode])

   const formatMetadataBucketLabel = useCallback(
      (code: string) =>
         isSpeciesMetadataEmptyBucketKey(code) ? t('speciesList.metadataNoValue') : code,
      [t],
   )

   const visibleRankGroups = useMemo(() => {
      const stats = rankStats ?? {}
      return SPECIES_RANK_GROUPS.filter((g) => rankGroupHasData(g.id, stats))
   }, [rankStats])

   useEffect(() => {
      if (explorerRankId === TAXONOMY_EXPLORER_TREE_MODE_ID) return
      if (visibleRankGroups.length === 0) {
         setExplorerRankId(TAXONOMY_EXPLORER_TREE_MODE_ID)
         return
      }
      if (!visibleRankGroups.some((g) => g.id === explorerRankId)) {
         setExplorerRankId(TAXONOMY_EXPLORER_TREE_MODE_ID)
      }
   }, [visibleRankGroups, explorerRankId])

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
            exhausted: false,
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
                  exhausted: rows.length === 0 || rows.length < TAXON_PAGE_SIZE,
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
      if (cache.loading || cache.loadingMore || cache.exhausted || cache.items.length >= cache.total) {
         return
      }

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
            const exhausted =
               rows.length === 0 ||
               rows.length < TAXON_PAGE_SIZE ||
               merged.length === cur.items.length
            return {
               ...prev,
               [rankId]: {
                  ...cur,
                  items: merged,
                  total: res.total,
                  nextOffset: offset + rows.length,
                  loadingMore: false,
                  exhausted,
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

   const handleTaxonomySectionOpen = useCallback(() => {
      if (explorerRankId === TAXONOMY_EXPLORER_TREE_MODE_ID) return
      const cur = taxonByRankRef.current[explorerRankId] ?? emptyRankTaxonCache()
      if (!cur.initialized && !cur.loading) {
         fetchRankTaxonsFirstPage(explorerRankId)
      }
   }, [explorerRankId, fetchRankTaxonsFirstPage])

   const onExplorerRankIdChange = useCallback(
      (rankId: string) => {
         setExplorerRankId(rankId)
         if (rankId === TAXONOMY_EXPLORER_TREE_MODE_ID) return
         const c = taxonByRankRef.current[rankId]
         if (!c?.initialized && !c?.loading) {
            fetchRankTaxonsFirstPage(rankId)
         }
      },
      [fetchRankTaxonsFirstPage],
   )

   const onLoadMoreExplorerRank = useCallback(() => {
      if (explorerRankId === TAXONOMY_EXPLORER_TREE_MODE_ID) return
      void loadMoreRankTaxons(explorerRankId)
   }, [explorerRankId, loadMoreRankTaxons])

   useEffect(() => {
      const timer = window.setTimeout(() => {
         setDebouncedSearch(searchInput.trim())
      }, 250)
      return () => window.clearTimeout(timer)
   }, [searchInput])

   const sortApi = useMemo(
      () => speciesSortToApi(resolveSpeciesSortMode(sortMode)),
      [sortMode],
   )

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
      if (effectiveSubProjectFilter !== 'all') {
         q.sub_project = speciesMetadataBucketToQueryValue(effectiveSubProjectFilter)
      }
      if (countriesEnabled && selectedCountryCodes.length > 0) {
         q.countries__in = [...selectedCountryCodes].sort().join(',')
      }
      if (goatEnabled && goatStatusFilters.length > 0) {
         q.goat_status__in = [...goatStatusFilters].sort().join(',')
      }
      appendCustomFieldListFilters(q, customFields, customFieldFilters)
      return q
   }, [
      debouncedSearch,
      selectedTaxonTaxid,
      effectiveIucnThreatFilter,
      effectiveSubProjectFilter,
      countriesEnabled,
      selectedCountryCodes,
      goatEnabled,
      goatStatusFilters,
      customFields,
      customFieldFilters,
      sortApi,
   ])

   const organismExportParams = useMemo(() => {
      const q: Record<string, string | number> = {
         sort_column: sortApi.sort_column,
         sort_order: sortApi.sort_order,
      }
      if (debouncedSearch) q.filter = debouncedSearch
      if (selectedTaxonTaxid) q.taxon_lineage = selectedTaxonTaxid
      if (effectiveIucnThreatFilter !== 'all') q.iucn_redlist__category = effectiveIucnThreatFilter
      if (effectiveSubProjectFilter !== 'all') {
         q.sub_project = speciesMetadataBucketToQueryValue(effectiveSubProjectFilter)
      }
      if (countriesEnabled && selectedCountryCodes.length > 0) {
         q.countries__in = [...selectedCountryCodes].sort().join(',')
      }
      if (goatEnabled && goatStatusFilters.length > 0) {
         q.goat_status__in = [...goatStatusFilters].sort().join(',')
      }
      appendCustomFieldListFilters(q, customFields, customFieldFilters)
      return q
   }, [
      debouncedSearch,
      selectedTaxonTaxid,
      effectiveIucnThreatFilter,
      effectiveSubProjectFilter,
      countriesEnabled,
      selectedCountryCodes,
      goatEnabled,
      goatStatusFilters,
      customFields,
      customFieldFilters,
      sortApi,
   ])

   const handleDownloadGoatReport = useCallback(async () => {
      if (!goatEnabled) return
      setGoatReportError(null)
      setGoatReportLoading(true)
      try {
         const { blob, filename } = await downloadGoatReport()
         const href = URL.createObjectURL(blob)
         const a = document.createElement('a')
         a.href = href
         a.download = filename
         document.body.appendChild(a)
         a.click()
         a.remove()
         URL.revokeObjectURL(href)
      } catch (e) {
         setGoatReportError(e instanceof Error ? e.message : String(e))
      } finally {
         setGoatReportLoading(false)
      }
   }, [goatEnabled])

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

   useEffect(() => {
      const root = mainScrollRef.current
      const sentinel = loadMoreSentinelRef.current
      if (!root || !sentinel) return

      const observer = new IntersectionObserver(
         (entries) => {
            if (!entries[0]?.isIntersecting) return
            loadMore()
         },
         { root, rootMargin: '400px', threshold: 0 },
      )
      observer.observe(sentinel)
      return () => observer.disconnect()
   }, [loadMore, items.length, total])

   const clearFilters = useCallback(() => {
      setSearchInput('')
      setDebouncedSearch('')
      setIucnThreatFilter('all')
      setSubProjectFilter('all')
      setCustomFieldFilters({})
      setSelectedCountryCodes([])
      setSelectedTaxonTaxid(null)
      setSelectedTaxonRankId(null)
      setLineageDisplayName(null)
      setGoatStatusFilters([])
   }, [])

   const clearLineage = useCallback(() => {
      setSelectedTaxonTaxid(null)
      setSelectedTaxonRankId(null)
      setLineageDisplayName(null)
   }, [])

   const handleTreeTaxonToggle = useCallback(
      (taxon: TaxonRecord) => {
         if (selectedTaxonTaxid === taxon.taxid) {
            clearLineage()
            return
         }
         setSelectedTaxonTaxid(taxon.taxid)
         setSelectedTaxonRankId(
            rankGroupIdFromApiRank(taxon.rank) ??
               (explorerRankId === TAXONOMY_EXPLORER_TREE_MODE_ID ? null : explorerRankId),
         )
         setLineageDisplayName(taxon.scientific_name || taxon.name || taxon.taxid)
      },
      [selectedTaxonTaxid, clearLineage, explorerRankId],
   )

   const filtersActive = Boolean(
      debouncedSearch ||
         selectedTaxonTaxid ||
         effectiveIucnThreatFilter !== 'all' ||
         effectiveSubProjectFilter !== 'all' ||
         customFields.some((field) => (customFieldFilters[field.key] ?? 'all') !== 'all') ||
         selectedCountryCodes.length > 0 ||
         (goatEnabled && goatStatusFilters.length > 0),
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
      if (selectedTaxonTaxid) {
         const labelName = lineageDisplayName ?? selectedTaxonTaxid
         const rg = selectedTaxonRankId
            ? SPECIES_RANK_GROUPS.find((g) => g.id === selectedTaxonRankId)
            : undefined
         const rankLabel = rg?.label ?? t('speciesList.taxon')
         chips.push({
            id: 'taxon',
            label: `${rankLabel}: ${labelName}`,
            removeAriaLabel: `${t('speciesList.removeFilter')} ${rankLabel}`,
            clear: clearLineage,
         })
      }
      if (effectiveSubProjectFilter !== 'all') {
         chips.push({
            id: 'sub_project',
            label: `${t('speciesList.subProjectSectionTitle')}: ${formatMetadataBucketLabel(effectiveSubProjectFilter)}`,
            removeAriaLabel: t('speciesList.removeSubProjectFilter'),
            clear: () => setSubProjectFilter('all'),
         })
      }
      for (const field of customFields) {
         const filterValue = customFieldFilters[field.key] ?? 'all'
         if (filterValue === 'all') continue
         chips.push({
            id: `custom_field-${field.key}`,
            label: `${field.label}: ${formatMetadataBucketLabel(filterValue)}`,
            removeAriaLabel: `${t('speciesList.removeFilter')} ${field.label}`,
            clear: () => setCustomFieldFilter(field.key, 'all'),
         })
      }
      if (countriesEnabled) {
         for (const code of [...selectedCountryCodes].sort()) {
            chips.push({
               id: `country-${code}`,
               label: `${t('speciesList.countrySectionTitle')}: ${countryLabelEn(code)}`,
               removeAriaLabel: `${t('speciesList.removeCountryFilter')} ${code}`,
               clear: () => setSelectedCountryCodes((prev) => prev.filter((c) => c !== code)),
            })
         }
      }
      if (goatEnabled) {
         for (const key of goatStatusFilters) {
            const label = labelGoatStatus(key) || key
            chips.push({
               id: `goat-${key}`,
               label: `${t('statusPage.filterGoatSectionTitle')}: ${label}`,
               removeAriaLabel: `${t('speciesList.removeFilter')} ${label}`,
               clear: () => toggleGoatStatusFilter(key),
            })
         }
      }
      return chips
   }, [
      debouncedSearch,
      effectiveIucnThreatFilter,
      effectiveSubProjectFilter,
      selectedTaxonTaxid,
      selectedTaxonRankId,
      lineageDisplayName,
      selectedCountryCodes,
      clearLineage,
      t,
      labelIucnThreatOption,
      formatMetadataBucketLabel,
      customFields,
      customFieldFilters,
      setCustomFieldFilter,
      goatEnabled,
      goatStatusFilters,
      toggleGoatStatusFilter,
   ])

   const activeFilterCount = activeFilterChips.length

   const treeSelectedTaxons = useMemo((): TaxonRecord[] => {
      if (!selectedTaxonTaxid) return []
      const label = lineageDisplayName ?? selectedTaxonTaxid
      const rankVal = selectedTaxonRankId
         ? SPECIES_RANK_GROUPS.find((g) => g.id === selectedTaxonRankId)?.apiRankParam.value
         : undefined
      return [
         {
            taxid: selectedTaxonTaxid,
            scientific_name: label,
            name: label,
            rank: rankVal,
            organisms_count: 0,
            assemblies_count: 0,
            annotations_count: 0,
         },
      ]
   }, [selectedTaxonTaxid, lineageDisplayName, selectedTaxonRankId])

   const taxonCacheForExplorerRank = useMemo(() => {
      if (explorerRankId === TAXONOMY_EXPLORER_TREE_MODE_ID) return emptyRankTaxonCache()
      return taxonByRank[explorerRankId] ?? emptyRankTaxonCache()
   }, [taxonByRank, explorerRankId])

   const { stages: goatTrackerStages, total: pipelineTotal } = useMemo(
      () => buildGoatTrackerStages(goatStats),
      [goatStats],
   )

   const goatFacetStatsLoading = goatEnabled && goatStats === null

   const filtersPanelProps = useMemo(
      (): SpeciesListFiltersPanelProps => ({
         searchInput,
         onSearchChange: setSearchInput,
         visibleRankGroups,
         rankStats,
         explorerRankId,
         onExplorerRankIdChange,
         taxonCacheForExplorerRank,
         onLoadMoreExplorerRank,
         treeSelectedTaxons,
         onTreeTaxonToggle: handleTreeTaxonToggle,
         onClearTaxonomyLineage: clearLineage,
         selectedTaxonTaxid,
         iucnFilterVisible,
         iucnThreatFilter,
         onIucnChange: setIucnThreatFilter,
         iucnOptions: iucnThreatSelectOptions,
         labelIucn: labelIucnThreatOption,
         subProjectFilterVisible,
         subProjectFilter,
         subProjectOptions,
         onSubProjectChange: setSubProjectFilter,
         customFieldsFilterVisible,
         customFields,
         customFieldFilters,
         customFieldStats,
         onCustomFieldChange: setCustomFieldFilter,
         formatMetadataBucketLabel,
         countryFilterSectionVisible,
         countryStats: countryFrequencyStats,
         selectedCountryCodes,
         onToggleCountryCode: toggleCountryCode,
         onClearCountrySelection: clearCountrySelection,
         showGoatFilters: goatEnabled,
         goatTrackerStages,
         goatStatusFilters,
         onToggleGoatStatus: toggleGoatStatusFilter,
         goatStats,
      }),
      [
         searchInput,
         visibleRankGroups,
         rankStats,
         explorerRankId,
         onExplorerRankIdChange,
         taxonCacheForExplorerRank,
         onLoadMoreExplorerRank,
         treeSelectedTaxons,
         handleTreeTaxonToggle,
         clearLineage,
         selectedTaxonTaxid,
         iucnFilterVisible,
         iucnThreatFilter,
         iucnThreatSelectOptions,
         labelIucnThreatOption,
         subProjectFilterVisible,
         subProjectFilter,
         subProjectOptions,
         customFieldsFilterVisible,
         customFields,
         customFieldFilters,
         customFieldStats,
         setCustomFieldFilter,
         formatMetadataBucketLabel,
         countryFilterSectionVisible,
         countryFrequencyStats,
         selectedCountryCodes,
         toggleCountryCode,
         clearCountrySelection,
         goatEnabled,
         goatTrackerStages,
         goatStatusFilters,
         toggleGoatStatusFilter,
         goatStats,
      ],
   )

   return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
         <header className="border-border shrink-0 border-b bg-gradient-to-b from-background to-muted/20 px-4 py-4">
            <div className="flex flex-col items-end gap-4 md:flex-row md:justify-between md:gap-8">
               <div className="min-w-0 flex-1 space-y-2">
                  <h1 className="flex min-w-0 items-center gap-3 text-3xl font-bold tracking-tight">
                     <SpeciesPageIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                     {t('speciesList.pageTitle')}
                  </h1>
                  <p className="text-pretty text-muted-foreground">
                     {t('speciesList.pageDescription')}
                  </p>
               </div>
               <div className="flex shrink-0 flex-wrap gap-2 md:justify-end">
                  {goatEnabled ? (
                     <Button
                        type="button"
                        className="gap-2.5"
                        aria-expanded={goatDrawerOpen}
                        aria-controls="goat-tools-drawer"
                        onClick={() => setGoatDrawerOpen(true)}
                     >
                        <img
                           src={goatStatusButtonIconSrc}
                           alt=""
                           className="size-6 shrink-0 object-contain"
                           width={24}
                           height={24}
                           aria-hidden
                        />
                        {t('speciesList.goatDrawerTrigger')}
                     </Button>
                  ) : null}
                  {!isLg ? (
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => setFiltersOpen(true)}
                     >
                        <Filter className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                        {t('catalog.filtersTitle')}
                        {activeFilterCount > 0 ? (
                           <Badge
                              variant="secondary"
                              className="ml-2 min-w-[1.25rem] justify-center px-1.5 tabular-nums"
                           >
                              {activeFilterCount}
                           </Badge>
                        ) : null}
                     </Button>
                  ) : null}
               </div>
            </div>
         </header>

         <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col overflow-hidden">
            <SpeciesListFilterAccordionProvider onTaxonomySectionOpen={handleTaxonomySectionOpen}>
               <>
                  <SpeciesListFacetStatsSync
                     statsQueryBase={statsQueryBase}
                     goatEnabled={goatEnabled}
                     showCountries={countriesEnabled}
                     organismStatsCacheRef={organismStatsCacheRef}
                     setIucnThreatStats={setIucnThreatStats}
                     setSubProjectStats={setSubProjectStats}
                     setGoatStats={setGoatStats}
                     customFields={customFields}
                     setCustomFieldStats={setCustomFieldStats}
                  />
                  <div className="flex min-h-0 min-w-0 flex-1 basis-0 items-stretch overflow-hidden">
                     {isLg ? (
                        <>
                           <aside className="flex min-h-0 w-[min(100%,400px)] shrink-0 flex-col overflow-hidden bg-background lg:w-[380px]">

                              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 py-2">
                                 <SpeciesListFiltersPanel {...filtersPanelProps} />
                              </div>
                           </aside>
                           {/* Dedicated 1px track so the rule always matches the full flex row height (border-r on the aside was not). */}
                           <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
                        </>
                     ) : null}

                     <div className="grid min-h-0 min-w-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-4 overflow-hidden px-4 py-3">
                        <div className="min-h-0 min-w-0 shrink-0">
                           <SpeciesExportSheet
                              open={exportSheetOpen}
                              onOpenChange={setExportSheetOpen}
                              exportParams={organismExportParams}
                              totalCount={total}
                           />

                           {error && items.length === 0 ? (
                              <p className="text-sm text-destructive" role="alert">
                                 {error}
                              </p>
                           ) : null}

                           <div
                              id="species-results"
                              className="flex min-w-0 scroll-mt-24 flex-col gap-3 pb-2"
                           >
                              <SpeciesListActiveFilters
                                 embedded
                                 embeddedBelowSearch
                                 activeFilterChips={activeFilterChips}
                                 filtersActive={filtersActive}
                                 onClearAllFilters={clearFilters}
                              />
                              <SpeciesListResultsSummary
                                 loading={loading}
                                 itemsLength={items.length}
                                 total={total}
                                 filtersActive={filtersActive}
                                 listRefreshing={listRefreshing}
                                 sortMode={sortMode}
                                 sortModes={visibleSortModes}
                                 onSortModeChange={setSortMode}
                                 onExportClick={() => setExportSheetOpen(true)}
                              />
                           </div>

                           {error && items.length > 0 ? (
                              <p
                                 className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                                 role="alert"
                              >
                                 {error}
                              </p>
                           ) : null}
                        </div>

                        <div
                           ref={mainScrollRef}
                           className="min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
                        >
                        {loading && items.length === 0 ? (
                           <div aria-busy="true" aria-label={t('common.loading')}>
                              <SpeciesListGridSkeleton className="pb-8" />
                           </div>
                        ) : items.length > 0 ? (
                           <>
                              <div
                                 className={cn(
                                    'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3',
                                    listRefreshing && 'opacity-[0.92] transition-opacity',
                                 )}
                              >
                                 {items.map((row, idx) => {
                                    const id = row.taxid != null ? String(row.taxid) : `row-${idx}`
                                    return (
                                       <SpeciesCard
                                          key={id}
                                          organism={row}
                                          lineageMode="summary"
                                          showGoatChips={goatEnabled}
                                       />
                                    )
                                 })}
                              </div>
                              {items.length < total ? (
                                 <div
                                    ref={loadMoreSentinelRef}
                                    className="flex min-h-14 items-center justify-center py-6"
                                 >
                                    {loadingMore ? (
                                       <Loader2
                                          className="h-6 w-6 animate-spin text-muted-foreground"
                                          aria-label={t('common.loading')}
                                       />
                                    ) : (
                                       <span className="sr-only">{t('common.loadMore')}</span>
                                    )}
                                 </div>
                              ) : null}
                           </>
                        ) : (
                           <div className="py-16 text-center text-muted-foreground">
                              <Filter className="mx-auto mb-4 h-12 w-12 opacity-50" aria-hidden />
                              <h3 className="mb-2 text-lg font-medium">{t('speciesList.noSpeciesFound')}</h3>
                              <p className="text-sm">{t('speciesList.tryAdjustingSearch')}</p>
                              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                                 {t('speciesList.clearAllFilters')}
                              </Button>
                           </div>
                        )}
                        </div>
                     </div>
                  </div>

               {goatEnabled ? (
                  <Sheet open={goatDrawerOpen} onOpenChange={setGoatDrawerOpen}>
                     <SheetContent
                        side="right"
                        id="goat-tools-drawer"
                        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
                     >
                        <SheetHeader className="shrink-0 border-b px-4 py-4 text-left">
                           <SheetTitle className="flex items-center gap-2.5 pr-8 text-left">
                              <img
                                 src={goatStatusButtonIconSrc}
                                 alt=""
                                 className="size-7 shrink-0 object-contain"
                                 width={28}
                                 height={28}
                                 aria-hidden
                              />
                              <span>{t('speciesList.goatDrawerTitle')}</span>
                           </SheetTitle>
                           <SheetDescription className="text-left">
                              {t('speciesList.goatDrawerDescription')}{' '}
                              <a
                                 href={GOAT_PUBLIC_INFO_URL}
                                 target="_blank"
                                 rel="noopener noreferrer"
                                 className="font-medium text-primary underline underline-offset-2 hover:no-underline"
                              >
                                 {t('speciesList.goatDrawerLearnMore')}
                              </a>
                           </SheetDescription>
                        </SheetHeader>
                        <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 py-4">
                           <div className="space-y-2">
                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
                                 <Button
                                    type="button"
                                    className="w-full gap-2 sm:w-auto"
                                    disabled={goatReportLoading}
                                    onClick={() => void handleDownloadGoatReport()}
                                 >
                                    {goatReportLoading ? (
                                       <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                    ) : (
                                       <Download className="h-4 w-4 shrink-0" aria-hidden />
                                    )}
                                    {t('speciesList.downloadGoatReport')}
                                 </Button>
                                 {goatProjectHref ? (
                                    <Button
                                       type="button"
                                       variant="outline"
                                       className="w-full gap-2 sm:w-auto"
                                       asChild
                                    >
                                       <a
                                          href={goatProjectHref}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                       >
                                          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
                                          {t('speciesList.viewInGoatProject')}
                                       </a>
                                    </Button>
                                 ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">{t('statusPage.registryDescription')}</p>
                              {goatReportError ? (
                                 <p className="text-sm text-destructive" role="alert">
                                    {goatReportError}
                                 </p>
                              ) : null}
                           </div>
                           <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
                              <GoatPipelineTracker
                                 layout="drawer"
                                 stages={goatTrackerStages}
                                 totalSpecies={pipelineTotal}
                                 loading={goatFacetStatsLoading}
                                 targetListStats={targetListStats}
                              />
                           </div>
                        </div>
                     </SheetContent>
                  </Sheet>
               ) : null}

               {!isLg ? (
                  <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
                     <SheetContent
                        side="left"
                        className="flex w-[min(100%,400px)] max-w-[min(100%,400px)] flex-col gap-0 border-r p-0 sm:max-w-[400px]"
                     >
                        <SheetHeader className="shrink-0 border-0 px-2 pt-3 pb-0">
                           <SheetTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {t('catalog.filtersTitle')}
                           </SheetTitle>
                        </SheetHeader>
                        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 pb-2">
                           <SpeciesListFiltersPanel {...filtersPanelProps} />
                        </div>
                     </SheetContent>
                  </Sheet>
               ) : null}
            </>
         </SpeciesListFilterAccordionProvider>
         </div>
      </div>
   )
}
