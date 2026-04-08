'use client'

import { useCallback, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SpeciesExportSheet } from '@/components/species-export-sheet'
import { GoatPipelineTracker } from '@/components/status/goat-pipeline-tracker'
import { SpeciesStatusTable } from '@/components/status/species-status-table'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import { buildGoatTrackerStages } from '@/lib/goatPipelineTracker'
import { GOAT_PIPELINE_STEPS } from '@/lib/organismStatusLabels'
import { useGoatStatusPageQuery } from '@/lib/status-tracker/useStatusTrackerQueries'
import { FeatureGate } from '@/components/feature-gate'
import { navRouteIcons } from '@/lib/portal'
import { Download, FileSpreadsheet, Loader2, Search } from 'lucide-react'

function interpolate(template: string, vars: Record<string, string | number>): string {
   let out = template
   for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v))
   }
   return out
}

export default function StatusTrackerPage() {
   const { t } = useLocale()
   const { config } = usePortalConfig()
   const tracker = useGoatStatusPageQuery({ config })
   const [exportSheetOpen, setExportSheetOpen] = useState(false)

   const {
      goatStatusFilters,
      setGoatStatusFilters,
      targetListFilter,
      setTargetListFilter,
      goatStats,
      targetListStats,
      statsLoading,
      statsError,
      rows,
      tableTotal,
      tableLoading,
      tableLoadingMore,
      tableError,
      loadMore,
      organismExportParams,
      goatReportLoading,
      goatReportError,
      onDownloadGoat,
      listSearchInput,
      setListSearchInput,
      resetTableFilters,
      hasActiveTableFilters,
   } = tracker

   const { stages, total: pipelineTotal } = useMemo(() => buildGoatTrackerStages(goatStats), [goatStats])

   const stageOrder = useMemo(
      () => new Map(GOAT_PIPELINE_STEPS.map((s, i) => [s.value, i] as const)),
      [],
   )

   const toggleGoatStatus = useCallback(
      (key: string) => {
         setGoatStatusFilters((prev) => {
            if (prev.includes(key)) return prev.filter((k) => k !== key)
            const next = [...prev, key]
            return next.sort((a, b) => (stageOrder.get(a) ?? 0) - (stageOrder.get(b) ?? 0))
         })
      },
      [setGoatStatusFilters, stageOrder],
   )

   const pageTitle = t('home.statusFeature.title')
   const shownCount = rows.length
   const StatusPageIcon = navRouteIcons.status

   return (
      <FeatureGate feature="goatStatus">
         <div className="min-h-screen bg-background">
            <div className="container mx-auto px-4 py-8">
               <div className="mb-8">
                  <h1 className="mb-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
                     <StatusPageIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden />
                     {pageTitle}
                  </h1>
                  <p className="text-muted-foreground max-w-2xl leading-relaxed text-sm sm:text-base">
                     {t('statusPage.pageDescription')}
                  </p>
               </div>

               {statsError ? (
                  <p className="mb-6 text-sm text-destructive" role="alert">
                     {statsError}
                  </p>
               ) : null}

               <>
                  <Card className="mb-6 rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
                     <CardHeader className="pb-2">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                           <div className="flex gap-3 min-w-0">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
                                 <FileSpreadsheet className="h-5 w-5" aria-hidden />
                              </div>
                              <div className="min-w-0">
                                 <CardTitle className="text-lg leading-snug">{t('statusPage.registryTitle')}</CardTitle>
                                 <CardDescription className="mt-1.5 max-w-2xl text-pretty leading-relaxed">
                                    {t('statusPage.registryDescription')}
                                 </CardDescription>
                              </div>
                           </div>
                           <Button
                              type="button"
                              className="shrink-0 gap-2"
                              disabled={goatReportLoading}
                              onClick={() => void onDownloadGoat()}
                           >
                              {goatReportLoading ? (
                                 <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                              ) : (
                                 <Download className="h-4 w-4" aria-hidden />
                              )}
                              {t('statusPage.downloadRegistryTsv')}
                           </Button>
                        </div>
                        {goatReportError ? <p className="text-sm text-destructive mt-2">{goatReportError}</p> : null}
                     </CardHeader>
                  </Card>

                  <Card className="overflow-hidden rounded-xl border border-border shadow-sm">
                     <CardContent className="p-0">
                        <div className="p-4 sm:p-6 sm:pb-5">
                           <GoatPipelineTracker
                              stages={stages}
                              totalSpecies={pipelineTotal}
                              loading={statsLoading}
                              selectedGoatStatuses={goatStatusFilters}
                              onToggleGoatStatus={toggleGoatStatus}
                              targetListFilter={targetListFilter}
                              onToggleTargetList={(value) => {
                                 setTargetListFilter((prev) => (prev === value ? '' : value))
                              }}
                              targetListStats={targetListStats}
                           />
                        </div>

                        <div className="border-t border-border bg-muted/25 px-4 py-4 sm:px-6">
                           <div className="flex flex-col gap-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                 <div className="min-w-0">
                                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                                       {t('statusPage.sectionSpecies')}
                                    </h2>
                                    <p className="mt-0.5 text-sm text-muted-foreground">
                                       {tableLoading ? (
                                          t('statusPage.speciesSubtitleLoading')
                                       ) : (
                                          interpolate(t('statusPage.speciesSubtitle'), {
                                             shown: shownCount,
                                             total: tableTotal,
                                          })
                                       )}
                                    </p>
                                 </div>
                                 <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-9 shrink-0 gap-2 self-start sm:self-center"
                                    onClick={() => setExportSheetOpen(true)}
                                 >
                                    <Download className="h-4 w-4" aria-hidden />
                                    {t('statusPage.exportFilteredTsv')}
                                 </Button>
                              </div>
                              <div className="relative w-full max-w-xl">
                                 <Search
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                                    aria-hidden
                                 />
                                 <Input
                                    type="search"
                                    value={listSearchInput}
                                    onChange={(e) => setListSearchInput(e.target.value)}
                                    placeholder={t('statusPage.listSearchPlaceholder')}
                                    className="h-9 pl-9"
                                    aria-label={t('statusPage.listSearchPlaceholder')}
                                 />
                              </div>
                           </div>
                        </div>

                        <div className="border-t border-border px-4 pb-6 pt-4 sm:px-6">
                           <SpeciesStatusTable
                              rows={rows}
                              tableTotal={tableTotal}
                              tableLoading={tableLoading}
                              tableLoadingMore={tableLoadingMore}
                              tableError={tableError}
                              onLoadMore={loadMore}
                              hasActiveFilters={hasActiveTableFilters}
                              onClearFilters={resetTableFilters}
                           />
                        </div>
                     </CardContent>
                  </Card>

                  <SpeciesExportSheet
                     open={exportSheetOpen}
                     onOpenChange={setExportSheetOpen}
                     exportParams={organismExportParams}
                     totalCount={tableTotal}
                  />
               </>
            </div>
         </div>
      </FeatureGate>
   )
}
