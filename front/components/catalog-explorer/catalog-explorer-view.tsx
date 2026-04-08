'use client'

import type { Dispatch, SetStateAction } from 'react'
import Link from 'next/link'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CatalogCharts, type CatalogChartDef } from '@/components/catalog-explorer/catalog-charts'
import { CatalogExportSheet } from '@/components/catalog-explorer/catalog-export-sheet'
import { CatalogFilters } from '@/components/catalog-explorer/catalog-filters'
import { CatalogModelTabs } from '@/components/catalog-explorer/catalog-model-tabs'
import { CatalogRecordActions } from '@/components/catalog-explorer/catalog-record-actions'
import { CatalogTable } from '@/components/catalog-explorer/catalog-table'
import type { FilterValuesState } from '@/lib/catalogQueryParams'
import { inferAnnotationRowSource } from '@/lib/catalog-explorer/annotationMetadataSource'
import type { ConfigFilter, DataModels } from '@/lib/portal/types'
import { taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import { navRouteIcons } from '@/lib/portal'
import { cn } from '@/lib/utils'
import { BarChart3, ChevronDown, Download, LayoutList, X } from 'lucide-react'

export type CatalogExplorerViewProps = {
   t: (key: string) => string

   countsReady: boolean
   visibleCatalogKeys: DataModels[]

   rootTaxid: string
   scopeTaxon: Record<string, unknown> | null
   catalogKey: DataModels
   onSelectCatalog: (k: DataModels) => void

   title: string
   description: string
   modelFilters: ConfigFilter[] | undefined
   filterValues: Record<string, FilterValuesState | undefined>
   setFilterValues: Dispatch<SetStateAction<Record<string, FilterValuesState | undefined>>>
   filterText: string
   setFilterText: (v: string) => void
   recordSearchPlaceholder: string
   selectOptions: Record<string, string[]>

   viewIsTable: boolean
   setViewTable: (table: boolean) => void

   charts: CatalogChartDef[]
   statsQuery: Record<string, string | number | boolean>
   chartTitles: Record<string, string>
   canFetchList: boolean

   columns: string[]
   columnLabels: Record<string, string>
   items: Record<string, unknown>[]
   total: number
   loading: boolean
   loadingMore: boolean
   listError: string | null
   sortColumn: string
   sortOrder: 'asc' | 'desc'
   onSort: (col: string) => void
   onRowClick: (row: Record<string, unknown>) => void
   onLoadMore: () => void
   onClearDetail: () => void

   detailRow: Record<string, unknown> | null
   speciesHref: string | null

   exportOpen: boolean
   setExportOpen: (o: boolean) => void
   effectiveTaxonLineageExport: string | null
   debouncedFilter: string
   sortColumnApi: string
}

function formatDetailJson(row: Record<string, unknown> | null): string {
   if (!row) return 'Select a record to inspect details.'
   try {
      return JSON.stringify(row, null, 2)
   } catch {
      return String(row)
   }
}

function annotationDetailSourceLabel(row: Record<string, unknown>, t: (key: string) => string): string {
   switch (inferAnnotationRowSource(row)) {
      case 'annotrieve':
         return t('catalog.annotationDetailAnnotrieve')
      case 'portal_custom':
         return t('catalog.annotationDetailPortal')
      default:
         return t('catalog.annotationDetailOther')
   }
}

export function CatalogExplorerView(p: CatalogExplorerViewProps) {
   const CatalogIcon = navRouteIcons.catalog
   const detailTitle =
      p.detailRow && typeof p.detailRow.name === 'string'
         ? p.detailRow.name
         : p.detailRow && typeof p.detailRow.scientific_name === 'string'
           ? p.detailRow.scientific_name
           : p.detailRow && typeof p.detailRow.assembly_name === 'string'
             ? p.detailRow.assembly_name
             : p.detailRow && typeof p.detailRow.accession === 'string'
               ? p.detailRow.accession
               : p.detailRow && typeof p.detailRow.run_accession === 'string'
                 ? p.detailRow.run_accession
                 : p.detailRow && typeof p.detailRow.local_id === 'string'
                   ? p.detailRow.local_id
                   : 'Record details'

   return (
      <div className="min-h-screen bg-background">
         <div className="container mx-auto px-4 py-8">
            <header className="mb-8 border-b border-border pb-8">
               <h1 className="text-3xl font-bold tracking-tight mb-3 flex items-center gap-3">
                  <CatalogIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                  {p.t('catalog.pageTitle')}
               </h1>
               <p className="text-muted-foreground text-base leading-relaxed max-w-3xl">
                  {p.t('catalog.pageDescription')}
               </p>
            </header>

            <div className="min-w-0 space-y-4">
               {p.countsReady && p.visibleCatalogKeys.length === 0 ? (
                  <Alert>
                     <AlertTitle>{p.t('catalog.noCatalogsAtTaxonTitle')}</AlertTitle>
                     <AlertDescription>
                        <span>{p.t('catalog.noCatalogsAtTaxonBody')}</span>
                     </AlertDescription>
                  </Alert>
               ) : null}

               {/* Root-scope model counts only — same component as before; no taxon / scope card. */}
               <CatalogModelTabs
                  scopeTaxon={p.scopeTaxon}
                  catalogKey={p.catalogKey}
                  catalogKeys={p.visibleCatalogKeys}
                  countsReady={p.countsReady}
                  onSelectCatalog={p.onSelectCatalog}
               />

               <Card className="border-border">
                  <CardHeader className="pb-4">
                     <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1.5">
                           <CardTitle className="text-lg">{p.title}</CardTitle>
                           {p.description ? <CardDescription>{p.description}</CardDescription> : null}
                        </div>
                        <DropdownMenu>
                           <DropdownMenuTrigger asChild>
                              <Button
                                 type="button"
                                 variant="outline"
                                 size="sm"
                                 className="h-9 shrink-0 gap-1 self-start"
                              >
                                 <Download className="h-4 w-4" />
                                 {p.t('catalog.export')}
                                 <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                              </Button>
                           </DropdownMenuTrigger>
                           <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => p.setExportOpen(true)}>
                                 {p.t('catalog.exportTsvJsonl')}
                              </DropdownMenuItem>
                           </DropdownMenuContent>
                        </DropdownMenu>
                     </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                     <CatalogFilters
                        filterDefs={p.modelFilters}
                        filterValues={p.filterValues}
                        onChange={(key, next) => p.setFilterValues((prev) => ({ ...prev, [key]: next }))}
                        searchValue={p.filterText}
                        onSearchChange={p.setFilterText}
                        searchPlaceholder={p.recordSearchPlaceholder}
                        selectOptions={p.selectOptions}
                     />
                  </CardContent>
               </Card>

               <Tabs
                  value={p.viewIsTable ? 'table' : 'dashboard'}
                  onValueChange={(v) => {
                     const next = v === 'table'
                     p.setViewTable(next)
                  }}
                  className="gap-4"
               >
                  <TabsList className="h-10 w-full sm:w-fit">
                     <TabsTrigger value="table" className="gap-1.5 px-4">
                        <LayoutList className="h-4 w-4" />
                        {p.t('catalog.viewTable')}
                     </TabsTrigger>
                     <TabsTrigger value="dashboard" className="gap-1.5 px-4">
                        <BarChart3 className="h-4 w-4" />
                        {p.t('catalog.viewDashboard')}
                     </TabsTrigger>
                  </TabsList>

                  <TabsContent value="table" className="mt-0 min-h-[12rem]">
                     <div
                        className={cn(
                           'grid gap-4',
                           p.detailRow ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-1',
                        )}
                     >
                        <div className="min-w-0 space-y-4">
                           {p.listError ? (
                              <p className="text-sm text-destructive" role="alert">
                                 {p.listError}
                              </p>
                           ) : null}
                           <CatalogTable
                              columns={p.columns}
                              columnLabels={p.columnLabels}
                              rows={p.items}
                              loading={p.loading}
                              loadingMore={p.loadingMore}
                              total={p.total}
                              sortColumn={p.sortColumn}
                              sortOrder={p.sortOrder}
                              onSort={p.onSort}
                              onRowClick={p.onRowClick}
                              onLoadMore={p.onLoadMore}
                              emptyMessage={p.t('catalog.tableEmpty')}
                           />
                        </div>
                        {p.detailRow ? (
                           <Card className="border-border xl:sticky xl:top-4 xl:self-start">
                              <CardHeader className="pb-3">
                                 <div className="flex items-start justify-between gap-2">
                                    <CardTitle className="line-clamp-2 text-base">{detailTitle}</CardTitle>
                                    <Button
                                       type="button"
                                       variant="ghost"
                                       size="icon"
                                       className="h-8 w-8 shrink-0"
                                       aria-label={p.t('catalog.clearRecordDetail')}
                                       onClick={() => p.onClearDetail()}
                                    >
                                       <X className="h-4 w-4" />
                                    </Button>
                                 </div>
                                 <CardDescription className="space-y-1">
                                    <span>
                                       {p.catalogKey} ·{' '}
                                       {p.detailRow?.taxid != null ? String(p.detailRow.taxid) : '—'}
                                    </span>
                                    {p.catalogKey === 'annotations' && p.detailRow ? (
                                       <span className="block rounded-md bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary">
                                          {annotationDetailSourceLabel(p.detailRow, p.t)}
                                       </span>
                                    ) : null}
                                 </CardDescription>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                 <div className="flex flex-wrap gap-2">
                                    {p.speciesHref ? (
                                       <Button variant="outline" size="sm" asChild>
                                          <Link href={p.speciesHref}>{p.t('catalog.openSpeciesPage')}</Link>
                                       </Button>
                                    ) : (
                                       <Button variant="outline" size="sm" asChild>
                                          <Link href={taxonomyTaxonHref(p.rootTaxid)}>
                                             {p.t('catalog.openTaxonomyView')}
                                          </Link>
                                       </Button>
                                    )}
                                    {p.detailRow ? (
                                       <CatalogRecordActions
                                          catalogKey={p.catalogKey}
                                          row={p.detailRow}
                                          t={p.t}
                                       />
                                    ) : null}
                                 </div>
                                 <div className="max-h-[42rem] overflow-auto rounded-md border border-border bg-muted/20 p-3">
                                    <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap break-words">
                                       {formatDetailJson(p.detailRow)}
                                    </pre>
                                 </div>
                              </CardContent>
                           </Card>
                        ) : null}
                     </div>
                  </TabsContent>

                  <TabsContent value="dashboard" className="mt-0 min-h-[12rem]">
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
                        />
                     ) : (
                        <p className="py-12 text-center text-sm text-muted-foreground">
                           {p.t('catalog.noChartsConfigured')}
                        </p>
                     )}
                  </TabsContent>
               </Tabs>
            </div>
         </div>

         <CatalogExportSheet
            open={p.exportOpen}
            onOpenChange={p.setExportOpen}
            model={p.catalogKey}
            fieldKeys={p.columns}
            taxonLineage={p.effectiveTaxonLineageExport}
            filterText={p.debouncedFilter}
            filterDefs={p.modelFilters}
            filterValues={p.filterValues}
            sortColumn={p.sortColumnApi}
            sortOrder={p.sortOrder}
            totalCount={p.total}
         />
      </div>
   )
}
