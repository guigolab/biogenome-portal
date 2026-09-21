'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CatalogExplorerView } from '@/components/catalog-explorer/catalog-explorer-view'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import { buildCatalogQueryParams, type FilterValuesState } from '@/lib/catalogQueryParams'
import {
   catalogColumnHeaderLabel,
   catalogModelKeysExcludingOrganisms,
   deriveCanFetchList,
   deriveVisibleCatalogKeys,
   readCatalogUrlState,
   resolveCatalogKey,
   type CatalogPageSize,
   useCatalogFilterSelectOptions,
   useCatalogList,
   useSyncInvalidCatalogParam,
   writeCatalogUrlState,
} from '@/lib/catalog-explorer'
import { defaultCatalogExportFields } from '@/lib/catalog-explorer/catalogRecordCardLayout'
import { fetchTaxon, getRootTaxid } from '@/lib/api/taxon'
import { pickLocalized } from '@/lib/i18n/pickLocalized'
import {
   citizenNodeToQueryParams,
   findCitizenNode,
   resolveCitizenTaxonomy,
} from '@/lib/citizenTaxonomy'
import type { CitizenTaxonomyNode, DataModels } from '@/lib/portal/types'
import { useRootTaxonStore } from '@/stores/root-taxon-store'
import { Loader2 } from 'lucide-react'
import type { CatalogChartDef } from '@/components/catalog-explorer/catalog-chart-def'
import { fetchAssembly } from '@/lib/api/assemblies'

/** Portal root scope; optional `tid` narrows list/charts to that taxon. */
export function CatalogExplorerPageClient() {
   const { config, loading: portalLoading } = usePortalConfig()
   const { locale, t } = useLocale()
   const router = useRouter()
   const pathname = usePathname()
   const searchParams = useSearchParams()

   const rootTaxon = useRootTaxonStore((s) => s.rootTaxon)
   const rootStatus = useRootTaxonStore((s) => s.status)
   const loadRootTaxon = useRootTaxonStore((s) => s.loadRootTaxon)

   useEffect(() => {
      void loadRootTaxon()
   }, [loadRootTaxon])

   const rootTaxid = String(rootTaxon?.taxid ?? getRootTaxid()).trim()
   const scopeTaxon = rootTaxon as Record<string, unknown> | null

   const allModelKeys = useMemo(() => catalogModelKeysExcludingOrganisms(config?.models), [config?.models])

   const initialUrl = useMemo(() => readCatalogUrlState(searchParams), []) // eslint-disable-line react-hooks/exhaustive-deps

   const [selectedCatalog, setSelectedCatalog] = useState<DataModels | null>(
      initialUrl.catalogKey ?? null,
   )
   const [viewMode, setViewMode] = useState<'dashboard' | 'table'>(
      initialUrl.viewMode ?? 'table',
   )
   const [pageSize, setPageSize] = useState<CatalogPageSize>(initialUrl.pageSize ?? 50)
   const [filterValues, setFilterValues] = useState<Record<string, FilterValuesState | undefined>>(
      initialUrl.filterValues ?? {},
   )
   const [speciesTaxid, setSpeciesTaxid] = useState<string | null>(initialUrl.speciesTaxid ?? null)
   const [citizenNodeId, setCitizenNodeId] = useState<string | null>(
      initialUrl.citizenNodeId ?? null,
   )
   const [scopedTaxonDoc, setScopedTaxonDoc] = useState<Record<string, unknown> | null>(null)
   const [scopedLoadState, setScopedLoadState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
   const [scopedTaxonError, setScopedTaxonError] = useState<string | null>(null)
   const scopedFetchSeq = useRef(0)

   const citizenTaxonomy = useMemo(() => resolveCitizenTaxonomy(config), [config])
   const selectedCitizenNode = useMemo(
      () =>
         citizenNodeId && citizenTaxonomy
            ? findCitizenNode(citizenTaxonomy.nodes, citizenNodeId)
            : null,
      [citizenNodeId, citizenTaxonomy],
   )
   const citizenQueryParams = useMemo(
      () => (selectedCitizenNode ? citizenNodeToQueryParams(selectedCitizenNode) : null),
      [selectedCitizenNode],
   )

   const fetchTaxidForCounts = useMemo(() => {
      if (citizenQueryParams?.taxon_lineage) return citizenQueryParams.taxon_lineage
      if (citizenQueryParams?.taxon_lineage__in) {
         const first = citizenQueryParams.taxon_lineage__in.split(',')[0]?.trim()
         return first || null
      }
      return speciesTaxid?.trim() || null
   }, [citizenQueryParams, speciesTaxid])

   useEffect(() => {
      const tid = fetchTaxidForCounts
      if (!tid || !/^[0-9]+$/.test(tid)) {
         setScopedTaxonDoc(null)
         setScopedLoadState(citizenNodeId ? 'ok' : 'idle')
         setScopedTaxonError(null)
         return
      }
      const seq = ++scopedFetchSeq.current
      setScopedLoadState('loading')
      setScopedTaxonError(null)
      void fetchTaxon(tid)
         .then((doc) => {
            if (seq !== scopedFetchSeq.current) return
            setScopedTaxonDoc(doc)
            setScopedLoadState('ok')
         })
         .catch(() => {
            if (seq !== scopedFetchSeq.current) return
            setScopedLoadState('err')
            setScopedTaxonError(t('catalog.taxonScopeFetchError'))
         })
   }, [fetchTaxidForCounts, citizenNodeId, t])

   const taxonForTabCounts = useMemo((): Record<string, unknown> | null => {
      if (!speciesTaxid?.trim() && !citizenNodeId) return scopeTaxon
      if (scopedTaxonDoc) return scopedTaxonDoc
      if (scopedLoadState === 'err' || (citizenNodeId && scopedLoadState === 'ok')) return scopeTaxon
      return null
   }, [speciesTaxid, citizenNodeId, scopedTaxonDoc, scopedLoadState, scopeTaxon])

   const tabsCountsReady =
      rootStatus === 'success' &&
      scopeTaxon != null &&
      ((!speciesTaxid?.trim() && !citizenNodeId) ||
         scopedLoadState === 'ok' ||
         scopedLoadState === 'err')

   const visibleCatalogKeys = useMemo(
      () => deriveVisibleCatalogKeys(tabsCountsReady, taxonForTabCounts, allModelKeys),
      [tabsCountsReady, taxonForTabCounts, allModelKeys],
   )

   const catalogKey = useMemo(
      () => resolveCatalogKey(selectedCatalog, visibleCatalogKeys, allModelKeys),
      [selectedCatalog, visibleCatalogKeys, allModelKeys],
   )

   useEffect(() => {
      if (selectedCatalog == null && allModelKeys.length > 0) {
         setSelectedCatalog(allModelKeys[0])
      }
   }, [selectedCatalog, allModelKeys])

   useSyncInvalidCatalogParam({
      countsReady: tabsCountsReady,
      visibleCatalogKeys,
      selectedCatalog: catalogKey,
      setSelectedCatalog,
   })

   const modelConfig = config?.models?.[catalogKey]

   // Reset facet filters when switching catalog model; keep taxon scope.
   useEffect(() => {
      setFilterValues({})
   }, [catalogKey])

   const exportFields = useMemo(() => {
      const fromConfig = modelConfig?.exportFields
      if (fromConfig?.length) return fromConfig
      return defaultCatalogExportFields(catalogKey)
   }, [modelConfig?.exportFields, catalogKey])

   const exportModelLabel = useMemo(
      () =>
         modelConfig?.label
            ? pickLocalized(modelConfig.label, locale, catalogKey)
            : catalogKey,
      [modelConfig?.label, locale, catalogKey],
   )

   const effectiveTaxonLineage = null as string | null

   const baseQuery = useMemo(() => {
      return buildCatalogQueryParams({
         taxonLineage: citizenQueryParams?.taxon_lineage ?? effectiveTaxonLineage,
         taxonLineageIn: citizenQueryParams?.taxon_lineage__in ?? null,
         taxonLineageNin: citizenQueryParams?.taxon_lineage__nin ?? null,
         speciesTaxid: citizenQueryParams ? null : speciesTaxid,
         filterDefs: modelConfig?.filters,
         filterValues,
      })
   }, [
      effectiveTaxonLineage,
      citizenQueryParams,
      speciesTaxid,
      modelConfig?.filters,
      filterValues,
   ])

   const { selectOptions, loadingFields, ensureSelectOptionsLoaded } = useCatalogFilterSelectOptions({
      catalogKey,
      filters: modelConfig?.filters,
      statsBase: baseQuery,
   })

   const canFetchList = deriveCanFetchList(
      null,
      catalogKey,
      allModelKeys,
      tabsCountsReady,
      visibleCatalogKeys,
   )

   const { items, total, loading, loadingMore, listError, loadMore } = useCatalogList({
      catalogKey,
      baseQuery,
      canFetchList,
      pageSize,
   })

   const setViewTable = useCallback((table: boolean) => setViewMode(table ? 'table' : 'dashboard'), [])

   const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null)
   const [exportOpen, setExportOpen] = useState(false)

   const onScatterAssemblyAccessionClick = useCallback(
      async (accession: string) => {
         const acc = accession.trim()
         if (!acc) return
         if (detailRow && String(detailRow.accession ?? '') === acc) {
            setDetailRow(null)
            return
         }
         try {
            const row = await fetchAssembly(acc)
            if (row) setDetailRow(row)
         } catch {
            /* ignore; optional: toast */
         }
      },
      [detailRow],
   )

   useEffect(() => {
      setDetailRow(null)
   }, [catalogKey])

   const clearAllFilters = useCallback(() => {
      setFilterValues({})
   }, [])

   const onSelectTaxon = useCallback((taxid: string, node: Record<string, unknown>) => {
      setCitizenNodeId(null)
      setSpeciesTaxid(taxid)
      setScopedTaxonDoc(node)
      setScopedTaxonError(null)
   }, [])

   const onSelectCitizenNode = useCallback((node: CitizenTaxonomyNode) => {
      setSpeciesTaxid(null)
      setCitizenNodeId(node.taxid)
      setScopedTaxonError(null)
   }, [])

   const onClearTaxon = useCallback(() => {
      setSpeciesTaxid(null)
      setCitizenNodeId(null)
      setScopedTaxonDoc(null)
      setScopedLoadState('idle')
      setScopedTaxonError(null)
   }, [])

   const onBrowseModeChange = useCallback(() => {
      onClearTaxon()
   }, [onClearTaxon])

   const charts: CatalogChartDef[] = useMemo(
      () =>
         (modelConfig?.charts ?? []).map((c) => ({
            field: c.field,
            type: c.type,
            size: c.size ?? 2,
            ...(c.xField !== undefined ? { xField: c.xField } : {}),
            ...(c.yField !== undefined ? { yField: c.yField } : {}),
            ...(c.colorField !== undefined ? { colorField: c.colorField } : {}),
         })),
      [modelConfig?.charts],
   )

   const chartTitles = useMemo(() => {
      const m: Record<string, string> = {}
      for (const ch of charts) {
         m[ch.field] = catalogColumnHeaderLabel(catalogKey, ch.field, locale)
      }
      return m
   }, [charts, catalogKey, locale])

   const speciesHref =
      detailRow?.taxid != null ? `/species/${encodeURIComponent(String(detailRow.taxid))}` : null

   const isMountedRef = useRef(false)
   useEffect(() => {
      if (!isMountedRef.current) {
         isMountedRef.current = true
         return
      }
      const params = writeCatalogUrlState({
         catalogKey,
         viewMode,
         pageSize,
         filterValues,
         speciesTaxid,
         citizenNodeId,
      })
      const qs = params.toString()
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
   }, [catalogKey, viewMode, pageSize, filterValues, speciesTaxid, citizenNodeId, pathname, router])

   useEffect(() => {
      function onKeyDown(e: KeyboardEvent) {
         const target = e.target as HTMLElement
         const inInput =
            target instanceof HTMLInputElement ||
            target instanceof HTMLTextAreaElement ||
            target.isContentEditable
         if (e.key === 'Escape' && detailRow) {
            setDetailRow(null)
            return
         }
         if ((e.key === 'j' || e.key === 'ArrowDown') && detailRow && !inInput) {
            e.preventDefault()
            const idx = items.indexOf(detailRow)
            if (idx < items.length - 1) setDetailRow(items[idx + 1] ?? null)
            return
         }
         if ((e.key === 'k' || e.key === 'ArrowUp') && detailRow && !inInput) {
            e.preventDefault()
            const idx = items.indexOf(detailRow)
            if (idx > 0) setDetailRow(items[idx - 1] ?? null)
         }
      }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
   }, [detailRow, items])

   if (portalLoading || !config || rootStatus === 'loading' || rootStatus === 'idle') {
      return (
         <div className="flex min-h-[50vh] items-center justify-center text-muted-foreground">
            <Loader2 className="h-10 w-10 animate-spin" aria-label="Loading" />
         </div>
      )
   }

   if (allModelKeys.length === 0) {
      return (
         <div className="container mx-auto px-4 py-12">
            <Alert>
               <AlertTitle>No catalog models</AlertTitle>
               <AlertDescription>portal.json does not define any non-species catalog models.</AlertDescription>
            </Alert>
         </div>
      )
   }

   return (
      <CatalogExplorerView
         t={t}
         countsReady={tabsCountsReady}
         visibleCatalogKeys={visibleCatalogKeys}
         rootTaxid={rootTaxid}
         scopeTaxon={taxonForTabCounts}
         catalogKey={catalogKey}
         onSelectCatalog={setSelectedCatalog}
         modelFilters={modelConfig?.filters}
         filterValues={filterValues}
         setFilterValues={setFilterValues}
         onClearAllFilters={clearAllFilters}
         speciesTaxid={speciesTaxid}
         citizenNodeId={citizenNodeId}
         citizenTaxonomy={citizenTaxonomy}
         onSelectTaxon={onSelectTaxon}
         onSelectCitizenNode={onSelectCitizenNode}
         onClearTaxon={onClearTaxon}
         onTaxonomyBrowseModeChange={onBrowseModeChange}
         scopedTaxonDoc={scopedTaxonDoc}
         scopedTaxonLoading={
            Boolean(fetchTaxidForCounts) &&
            /^[0-9]+$/.test(fetchTaxidForCounts ?? '') &&
            scopedLoadState === 'loading'
         }
         scopedTaxonError={scopedTaxonError}
         catalogModelKeys={allModelKeys}
         taxonLineageIn={citizenQueryParams?.taxon_lineage__in ?? null}
         taxonLineageNin={citizenQueryParams?.taxon_lineage__nin ?? null}
         selectOptions={selectOptions}
         ensureSelectOptionsLoaded={ensureSelectOptionsLoaded}
         selectOptionsLoading={loadingFields}
         viewIsTable={viewMode === 'table'}
         setViewTable={setViewTable}
         charts={charts}
         statsQuery={baseQuery}
         chartTitles={chartTitles}
         canFetchList={canFetchList}
         exportFieldKeys={exportFields}
         exportCardFields={modelConfig?.cardFields}
         exportModelLabel={exportModelLabel}
         items={items}
         total={total}
         loading={loading}
         loadingMore={loadingMore}
         listError={listError}
         onRowClick={(row) => setDetailRow(row)}
         onScatterAssemblyAccessionClick={onScatterAssemblyAccessionClick}
         onClearDetail={() => setDetailRow(null)}
         onLoadMore={loadMore}
         detailRow={detailRow}
         speciesHref={speciesHref}
         exportOpen={exportOpen}
         setExportOpen={setExportOpen}
         effectiveTaxonLineageExport={
            citizenQueryParams?.taxon_lineage ?? effectiveTaxonLineage
         }
      />
   )
}
