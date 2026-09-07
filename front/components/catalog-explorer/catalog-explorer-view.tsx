'use client'

import type { Dispatch, SetStateAction } from 'react'
import { useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { CatalogCharts, type CatalogChartDef } from '@/components/catalog-explorer/catalog-charts'
import { CatalogExportSheet } from '@/components/catalog-explorer/catalog-export-sheet'
import { CatalogFilters } from '@/components/catalog-explorer/catalog-filters'
import { CatalogModelTabs } from '@/components/catalog-explorer/catalog-model-tabs'
import { CatalogRecordCardGrid } from '@/components/catalog-explorer/catalog-record-card-grid'
import { CatalogRecordDetailSheet } from '@/components/catalog-explorer/catalog-record-detail-sheet'
import { CatalogViewModeTabs } from '@/components/catalog-explorer/catalog-results-bar'
import { CatalogTaxonScopePopover } from '@/components/catalog-explorer/catalog-taxon-scope-popover'
import { SpeciesListActiveFilters } from '@/components/species-list/species-list-active-filters'
import { useLocale } from '@/contexts/locale-context'
import { useMinWidthLg } from '@/hooks/use-min-width-lg'
import type { FilterValuesState } from '@/lib/catalogQueryParams'
import {
   buildCatalogActiveFilterChips,
   catalogHasStructuredFilters,
   type SelectOptionWithCount,
} from '@/lib/catalog-explorer'
import type { CatalogCardFieldDef, ConfigFilter, DataModels } from '@/lib/portal/types'
import { navRouteIcons } from '@/lib/portal'
import { cn } from '@/lib/utils'
import { Download, Filter } from 'lucide-react'

const VIEW_TAB_PANEL_CLASS = 'mt-0 min-h-0 flex-1 outline-none data-[state=inactive]:hidden'

export type CatalogExplorerViewProps = {
   t: (key: string) => string

   countsReady: boolean
   visibleCatalogKeys: DataModels[]

   rootTaxid: string
   scopeTaxon: Record<string, unknown> | null
   catalogKey: DataModels
   onSelectCatalog: (k: DataModels) => void

   modelFilters: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
   setFilterValues: Dispatch<SetStateAction<Record<string, FilterValuesState | undefined>>>
   onClearAllFilters: () => void
   speciesTaxid: string | null
   onSelectTaxon: (taxid: string, node: Record<string, unknown>) => void
   onClearTaxon: () => void
   scopedTaxonDoc: Record<string, unknown> | null
   scopedTaxonLoading: boolean
   scopedTaxonError: string | null
   selectOptions: Record<string, SelectOptionWithCount[]>
   ensureSelectOptionsLoaded?: (fieldKey: string) => void
   selectOptionsLoading?: Record<string, boolean>

   viewIsTable: boolean
   setViewTable: (table: boolean) => void

   charts: CatalogChartDef[]
   /** Catalog list query params for charts, histograms, experiments (same filters as list). */
   statsQuery: Record<string, string | number | boolean>
   chartTitles: Record<string, string>
   canFetchList: boolean

   /** TSV / export sheet field paths (from portal `exportFields`). */
   exportFieldKeys: string[]
   /** Card field defs for export column labels (portal merge, optional `label` per key). */
   exportCardFields: CatalogCardFieldDef[] | undefined
   /** Localized catalog tab title for the export sheet header. */
   exportModelLabel: string
   items: Record<string, unknown>[]
   total: number
   loading: boolean
   loadingMore: boolean
   listError: string | null
   onRowClick: (row: Record<string, unknown>) => void
   onLoadMore: () => void
   onClearDetail: () => void
   /** Assemblies dashboard: scatter point opens assembly detail (toggle). */
   onScatterAssemblyAccessionClick?: (accession: string) => void

   detailRow: Record<string, unknown> | null
   speciesHref: string | null

   exportOpen: boolean
   setExportOpen: (o: boolean) => void
   effectiveTaxonLineageExport: string | null
}

export function CatalogExplorerView(p: CatalogExplorerViewProps) {
   const CatalogIcon = navRouteIcons.catalog
   const { locale } = useLocale()
   const isLg = useMinWidthLg()
   const [filtersOpen, setFiltersOpen] = useState(false)

   const activeFilterChips = useMemo(
      () =>
         buildCatalogActiveFilterChips({
            filterDefs: p.modelFilters,
            filterValues: p.filterValues,
            locale,
            t: p.t,
            setFilterValues: p.setFilterValues,
         }),
      [p.modelFilters, p.filterValues, locale, p.t, p.setFilterValues],
   )

   const activeFilterCount = activeFilterChips.length

   const filtersActive = useMemo(
      () => catalogHasStructuredFilters(p.modelFilters, p.filterValues),
      [p.modelFilters, p.filterValues],
   )

   const showModelTabs = p.countsReady && p.visibleCatalogKeys.length > 0

   const showActiveFiltersRow = activeFilterChips.length > 0 || filtersActive

   const filtersSidebar = (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-2 py-2">
         <CatalogFilters
            key={p.catalogKey}
            catalogKey={p.catalogKey}
            filterDefs={p.modelFilters}
            filterValues={p.filterValues}
            onChange={(key, next) => p.setFilterValues((prev) => ({ ...prev, [key]: next }))}
            statsQuery={p.statsQuery}
            selectOptions={p.selectOptions}
            ensureSelectOptionsLoaded={p.ensureSelectOptionsLoaded}
            selectOptionsLoading={p.selectOptionsLoading}
         />
      </div>
   )

   return (
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-background">
         <header className="border-border shrink-0 border-b bg-gradient-to-b from-background to-muted/20 px-4 py-4">
            <div className="flex flex-col gap-4">
               <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-8">
                  <div className="min-w-0 flex-1 space-y-2">
                     <h1 className="flex min-w-0 items-center gap-3 text-3xl font-bold tracking-tight">
                        <CatalogIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                        {p.t('catalog.pageTitle')}
                     </h1>
                     <p className="text-pretty text-muted-foreground">{p.t('catalog.pageDescription')}</p>
                  </div>
                  {!isLg ? (
                     <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full shrink-0 gap-2 sm:w-auto"
                        onClick={() => setFiltersOpen(true)}
                     >
                        <Filter className="h-4 w-4 shrink-0" aria-hidden />
                        {p.t('catalog.filtersTitle')}
                        {activeFilterCount > 0 ? (
                           <Badge
                              variant="secondary"
                              className="ml-1 min-w-[1.25rem] justify-center px-1.5 tabular-nums"
                           >
                              {activeFilterCount}
                           </Badge>
                        ) : null}
                     </Button>
                  ) : null}
               </div>

               <div className="flex min-w-0 flex-col gap-3 md:flex-row md:items-center">
                  <CatalogTaxonScopePopover
                     speciesTaxid={p.speciesTaxid}
                     scopedTaxonDoc={p.scopedTaxonDoc}
                     scopedTaxonLoading={p.scopedTaxonLoading}
                     scopedTaxonError={p.scopedTaxonError}
                     onSelectTaxon={p.onSelectTaxon}
                     onClearTaxon={p.onClearTaxon}
                  />
                  {showModelTabs ? (
                     <CatalogModelTabs
                        className="w-full md:justify-end"
                        scopeTaxon={p.scopeTaxon}
                        catalogKey={p.catalogKey}
                        catalogKeys={p.visibleCatalogKeys}
                        countsReady={p.countsReady}
                        onSelectCatalog={p.onSelectCatalog}
                     />
                  ) : null}
               </div>
            </div>
         </header>

         <div className="flex min-h-0 min-w-0 flex-1 basis-0 overflow-hidden">
            {isLg ? (
               <>
                  <aside className="flex min-h-0 w-[min(100%,400px)] shrink-0 flex-col overflow-hidden bg-background lg:w-[380px]">
                     {filtersSidebar}
                  </aside>
                  <div className="w-px shrink-0 self-stretch bg-border" aria-hidden />
               </>
            ) : null}

            <div
               className={cn(
                  'flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pb-3',
                  !isLg && 'w-full',
               )}
            >
               {(p.countsReady && p.visibleCatalogKeys.length === 0) || p.listError ? (
                  <div className="shrink-0 pt-3">
                     {p.countsReady && p.visibleCatalogKeys.length === 0 ? (
                        <Alert>
                           <AlertTitle>{p.t('catalog.noCatalogsAtTaxonTitle')}</AlertTitle>
                           <AlertDescription>
                              <span>{p.t('catalog.noCatalogsAtTaxonBody')}</span>
                           </AlertDescription>
                        </Alert>
                     ) : null}
                     {p.listError ? (
                        <p className="text-sm text-destructive" role="alert">
                           {p.listError}
                        </p>
                     ) : null}
                  </div>
               ) : null}

               <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <Tabs
                     value={p.viewIsTable ? 'table' : 'dashboard'}
                     onValueChange={(v) => {
                        p.setViewTable(v === 'table')
                     }}
                     className="flex min-h-0 min-w-0 flex-1 flex-col gap-0"
                  >
                     <div
                        id="catalog-results"
                        className="flex min-w-0 scroll-mt-24 flex-col gap-3 pt-3 pb-3"
                     >
                        {/* Row 1: counts (table view, left) + view mode tabs + export (right) */}
                        <div className="flex min-w-0 items-center justify-between gap-3">
                           <CatalogViewModeTabs t={p.t} />
                           <div className="flex items-center gap-3">
                              {p.viewIsTable ? (
                                 <p
                                    className="text-sm leading-snug text-muted-foreground tabular-nums"
                                    role="status"
                                    aria-live="polite"
                                 >
                                    {p.loading ? (
                                       p.t('common.loading')
                                    ) : (
                                       <>
                                          {p.t('common.showing')} {p.items.length.toLocaleString()}{' '}
                                          {p.t('common.of')} {p.total.toLocaleString()}{' '}
                                          {p.t('catalog.records')}
                                          {filtersActive ? (
                                             <> · {p.t('speciesList.filtered')}</>
                                          ) : null}
                                       </>
                                    )}
                                 </p>
                              ) : null}
                              <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 className="h-10 shrink-0 gap-1.5 px-3"
                                 onClick={() => p.setExportOpen(true)}
                              >
                                 <Download className="h-4 w-4 shrink-0" aria-hidden />
                                 {p.t('catalog.exportRecords')}
                              </Button>
                           </div>

                        </div>

                        {/* Row 2: active filter chips — only when filters are applied */}
                        {showActiveFiltersRow ? (
                           <div className="min-w-0">
                              <SpeciesListActiveFilters
                                 embedded
                                 embeddedBelowSearch
                                 activeFilterChips={activeFilterChips}
                                 filtersActive={filtersActive}
                                 onClearAllFilters={p.onClearAllFilters}
                                 activeFiltersHeading={p.t('catalog.activeFilters')}
                                 clearAllFiltersLabel={p.t('catalog.clearAllFilters')}
                              />
                           </div>
                        ) : null}
                     </div>

                     <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-4 [scrollbar-gutter:stable]">
                        <TabsContent value="table" className={VIEW_TAB_PANEL_CLASS}>
                           <div className="min-w-0 space-y-4 pb-4">
                              <CatalogRecordCardGrid
                                 model={p.catalogKey}
                                 rows={p.items}
                                 loading={p.loading}
                                 loadingMore={p.loadingMore}
                                 total={p.total}
                                 onRowClick={p.onRowClick}
                                 onLoadMore={p.onLoadMore}
                                 emptyMessage={p.t('catalog.tableEmpty')}
                                 activeRow={p.detailRow}
                              />
                           </div>
                        </TabsContent>

                        <TabsContent value="dashboard" className={VIEW_TAB_PANEL_CLASS}>
                           <div className="pb-4">
                              {!p.canFetchList && p.countsReady ? (
                                 <p className="py-12 text-center text-sm text-muted-foreground">
                                    {p.t('catalog.noCatalogsWithData')}
                                 </p>
                              ) : p.charts.length > 0 ? (
                                 <CatalogCharts
                                    model={p.catalogKey}
                                    charts={p.charts}
                                    statsQuery={p.statsQuery}
                                    chartTitles={p.chartTitles}
                                    listSampleRows={p.items}
                                    t={p.t}
                                    onScatterAssemblyAccessionClick={p.onScatterAssemblyAccessionClick}
                                 />
                              ) : (
                                 <p className="py-12 text-center text-sm text-muted-foreground">
                                    {p.t('catalog.noChartsConfigured')}
                                 </p>
                              )}
                           </div>
                        </TabsContent>
                     </div>
                  </Tabs>
               </div>
            </div>
         </div>

         {!isLg ? (
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
               <SheetContent
                  side="left"
                  className="flex w-[min(100%,400px)] max-w-[min(100%,400px)] flex-col gap-0 border-r p-0 sm:max-w-[400px]"
               >
                  <SheetHeader className="shrink-0 border-0 px-2 pt-3 pb-0">
                     <SheetTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {p.t('catalog.filtersTitle')}
                     </SheetTitle>
                  </SheetHeader>
                  {filtersSidebar}
               </SheetContent>
            </Sheet>
         ) : null}

         <CatalogExportSheet
            open={p.exportOpen}
            onOpenChange={p.setExportOpen}
            model={p.catalogKey}
            modelLabel={p.exportModelLabel}
            fieldKeys={p.exportFieldKeys}
            cardFields={p.exportCardFields}
            taxonLineage={p.effectiveTaxonLineageExport}
            filterDefs={p.modelFilters}
            filterValues={p.filterValues}
            speciesTaxid={p.speciesTaxid}
            totalCount={p.total}
         />

         <CatalogRecordDetailSheet
            open={p.detailRow != null}
            onOpenChange={(next) => {
               if (!next) p.onClearDetail()
            }}
            catalogKey={p.catalogKey}
            detailRow={p.detailRow}
            rootTaxid={p.rootTaxid}
            speciesHref={p.speciesHref}
            t={p.t}
         />
      </div>
   )
}
