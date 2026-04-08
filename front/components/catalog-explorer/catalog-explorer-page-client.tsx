'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { CatalogExplorerView } from '@/components/catalog-explorer/catalog-explorer-view'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import {
   buildCatalogQueryParams,
   sortColumnForApi,
   type FilterValuesState,
} from '@/lib/catalogQueryParams'
import {
   catalogColumnHeaderLabel,
   catalogModelKeysExcludingOrganisms,
   defaultSortColumnForCatalog,
   deriveCanFetchList,
   deriveVisibleCatalogKeys,
   resolveCatalogKey,
   useCatalogFilterSelectOptions,
   useCatalogList,
   useSyncInvalidCatalogParam,
} from '@/lib/catalog-explorer'
import { getRootTaxid } from '@/lib/api/taxon'
import { pickLocalized } from '@/lib/i18n/pickLocalized'
import type { DataModels } from '@/lib/portal/types'
import { useRootTaxonStore } from '@/stores/root-taxon-store'
import { Loader2 } from 'lucide-react'
import type { CatalogChartDef } from '@/components/catalog-explorer/catalog-charts'

/** Portal root scope only: no `taxid` in URL; list/charts use root taxon lineage context. */
export function CatalogExplorerPageClient() {
   const { config, loading: portalLoading } = usePortalConfig()
   const { locale, t } = useLocale()

   const rootTaxon = useRootTaxonStore((s) => s.rootTaxon)
   const rootStatus = useRootTaxonStore((s) => s.status)
   const loadRootTaxon = useRootTaxonStore((s) => s.loadRootTaxon)

   useEffect(() => {
      void loadRootTaxon()
   }, [loadRootTaxon])

   const rootTaxid = String(rootTaxon?.taxid ?? getRootTaxid()).trim()
   const scopeTaxon = rootTaxon as Record<string, unknown> | null

   const allModelKeys = useMemo(() => catalogModelKeysExcludingOrganisms(config?.models), [config?.models])

   const countsReady = rootStatus === 'success' && scopeTaxon != null

   const visibleCatalogKeys = useMemo(
      () => deriveVisibleCatalogKeys(countsReady, scopeTaxon, allModelKeys),
      [countsReady, scopeTaxon, allModelKeys],
   )

   const [selectedCatalog, setSelectedCatalog] = useState<DataModels | null>(null)
   const [viewMode, setViewMode] = useState<'dashboard' | 'table'>('table')

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
      countsReady,
      visibleCatalogKeys,
      selectedCatalog: catalogKey,
      setSelectedCatalog,
   })

   const modelConfig = config?.models?.[catalogKey]

   const [filterText, setFilterText] = useState('')
   const [debouncedFilter, setDebouncedFilter] = useState('')
   useEffect(() => {
      const timer = window.setTimeout(() => setDebouncedFilter(filterText.trim()), 250)
      return () => window.clearTimeout(timer)
   }, [filterText])

   const [filterValues, setFilterValues] = useState<Record<string, FilterValuesState | undefined>>({})

   useEffect(() => {
      setFilterValues({})
      setFilterText('')
      setDebouncedFilter('')
   }, [catalogKey])

   const columns = useMemo(() => modelConfig?.columns ?? ['taxid', 'scientific_name'], [modelConfig])

   const columnLabels = useMemo(
      () =>
         Object.fromEntries(
            columns.map((c) => [c, catalogColumnHeaderLabel(catalogKey, c, locale)]),
         ),
      [columns, catalogKey, locale],
   )

   const [sortColumn, setSortColumn] = useState('taxid')
   const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

   useEffect(() => {
      setSortColumn(defaultSortColumnForCatalog(catalogKey, columns))
      setSortOrder('asc')
   }, [catalogKey, columns])

   const onSort = useCallback(
      (col: string) => {
         setSortColumn((prev) => {
            if (prev === col) {
               setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))
               return prev
            }
            setSortOrder('asc')
            return col
         })
      },
      [setSortOrder],
   )

   /** Root scope: no `taxon_lineage` query param (same as previous “portal root” selection). */
   const effectiveTaxonLineage = null as string | null

   const selectOptions = useCatalogFilterSelectOptions({
      catalogKey,
      filters: modelConfig?.filters,
      effectiveTaxonLineage,
   })

   const baseQuery = useMemo(() => {
      return buildCatalogQueryParams({
         taxonLineage: effectiveTaxonLineage,
         filter: debouncedFilter || undefined,
         sortColumn: sortColumnForApi(sortColumn),
         sortOrder,
         filterDefs: modelConfig?.filters,
         filterValues,
      })
   }, [effectiveTaxonLineage, debouncedFilter, sortColumn, sortOrder, modelConfig?.filters, filterValues])

   const statsQuery = useMemo(() => {
      const q = { ...baseQuery }
      delete (q as Record<string, unknown>).sort_column
      delete (q as Record<string, unknown>).sort_order
      return q
   }, [baseQuery])

   const canFetchList = deriveCanFetchList(
      null,
      catalogKey,
      allModelKeys,
      countsReady,
      visibleCatalogKeys,
   )

   const { items, total, loading, loadingMore, listError, loadMore } = useCatalogList({
      catalogKey,
      baseQuery,
      canFetchList,
   })

   const setViewTable = useCallback((table: boolean) => setViewMode(table ? 'table' : 'dashboard'), [])

   const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null)
   const [exportOpen, setExportOpen] = useState(false)

   useEffect(() => {
      setDetailRow(null)
   }, [catalogKey])

   const title = pickLocalized(modelConfig?.label, locale, catalogKey)
   const description = pickLocalized(modelConfig?.description, locale, '')

   const charts: CatalogChartDef[] = useMemo(
      () =>
         (modelConfig?.charts ?? []).map((c) => ({
            field: c.field,
            type: c.type,
            size: c.size ?? 2,
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

   const recordSearchPlaceholder = useMemo(() => {
      const key = `catalog.searchRecords.${catalogKey}` as const
      const specific = t(key)
      return specific !== key ? specific : t('catalog.recordSearchPlaceholder')
   }, [catalogKey, t])

   const speciesHref =
      detailRow?.taxid != null ? `/species/${encodeURIComponent(String(detailRow.taxid))}` : null

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
         countsReady={countsReady}
         visibleCatalogKeys={visibleCatalogKeys}
         rootTaxid={rootTaxid}
         scopeTaxon={scopeTaxon}
         catalogKey={catalogKey}
         onSelectCatalog={setSelectedCatalog}
         title={title}
         description={description}
         modelFilters={modelConfig?.filters}
         filterValues={filterValues}
         setFilterValues={setFilterValues}
         filterText={filterText}
         setFilterText={setFilterText}
         recordSearchPlaceholder={recordSearchPlaceholder}
         selectOptions={selectOptions}
         viewIsTable={viewMode === 'table'}
         setViewTable={setViewTable}
         charts={charts}
         statsQuery={statsQuery}
         chartTitles={chartTitles}
         canFetchList={canFetchList}
         columns={columns}
         columnLabels={columnLabels}
         items={items}
         total={total}
         loading={loading}
         loadingMore={loadingMore}
         listError={listError}
         sortColumn={sortColumn}
         sortOrder={sortOrder}
         onSort={onSort}
         onRowClick={(row) => {
            setDetailRow(row)
         }}
         onClearDetail={() => setDetailRow(null)}
         onLoadMore={loadMore}
         detailRow={detailRow}
         speciesHref={speciesHref}
         exportOpen={exportOpen}
         setExportOpen={setExportOpen}
         effectiveTaxonLineageExport={effectiveTaxonLineage}
         debouncedFilter={debouncedFilter}
         sortColumnApi={sortColumnForApi(sortColumn)}
      />
   )
}
