'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CatalogRecordCardGrid } from '@/components/catalog-explorer/catalog-record-card-grid'
import { CatalogRecordDetailSheet } from '@/components/catalog-explorer/catalog-record-detail-sheet'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import { getRootTaxid } from '@/lib/api/taxon'
import { fetchOrganismRelatedWithTotal, type OrganismRelatedModel } from '@/lib/api/organisms'
import { ModelIcon } from '@/lib/modelIcons'
import type { AppConfig, DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'

function labelForCatalogModel(
   k: DataModels,
   models: AppConfig['models'] | undefined,
   locale: string,
   t: (key: string) => string,
): string {
   const labels = models?.[k]?.label
   if (labels && typeof labels === 'object') {
      const fromLocale = labels[locale]
      const fromEn = labels.en
      const pick =
         (typeof fromLocale === 'string' && fromLocale.trim() ? fromLocale : null) ??
         (typeof fromEn === 'string' && fromEn.trim() ? fromEn : null) ??
         Object.values(labels).find((x) => typeof x === 'string' && String(x).trim())
      if (typeof pick === 'string' && pick.trim()) return pick.trim()
   }
   const key = `models.${k}` as const
   const tr = t(key)
   if (tr && tr !== key) return tr
   return k.replace(/_/g, ' ')
}

export type RelatedCatalogModel = OrganismRelatedModel

type Counts = {
   assemblies: number
   biosamples: number
   reads: number
}

type CachedModel = {
   data: Record<string, unknown>[]
   total: number
}

type SpeciesRelatedRecordsTabsProps = {
   taxid: string
   counts: Counts
   /** First model in assemblies → biosamples → reads with count &gt; 0. */
   defaultModel: RelatedCatalogModel
   initialRows: Record<string, unknown>[]
   /** Total count for `initialRows` query (same as catalog “Showing n of total”). */
   initialTotal: number
}

function speciesHrefForRow(row: Record<string, unknown>): string | null {
   if (row.taxid == null) return null
   return `/species/${encodeURIComponent(String(row.taxid))}`
}

type VisibleModel = { key: OrganismRelatedModel; count: number }

export function SpeciesRelatedRecordsTabs({
   taxid,
   counts,
   defaultModel,
   initialRows,
   initialTotal,
}: SpeciesRelatedRecordsTabsProps) {
   const { config } = usePortalConfig()
   const { locale, t } = useLocale()
   const rootTaxid = String(getRootTaxid()).trim()

   const visibleModels: VisibleModel[] = []
   if (counts.assemblies > 0) visibleModels.push({ key: 'assemblies', count: counts.assemblies })
   if (counts.biosamples > 0) visibleModels.push({ key: 'biosamples', count: counts.biosamples })
   if (counts.reads > 0) visibleModels.push({ key: 'reads', count: counts.reads })

   const [activeModel, setActiveModel] = useState<RelatedCatalogModel>(defaultModel)
   const [detailRow, setDetailRow] = useState<Record<string, unknown> | null>(null)

   const [cache, setCache] = useState<Record<RelatedCatalogModel, CachedModel | null>>({
      assemblies: defaultModel === 'assemblies' ? { data: initialRows, total: initialTotal } : null,
      biosamples: defaultModel === 'biosamples' ? { data: initialRows, total: initialTotal } : null,
      reads: defaultModel === 'reads' ? { data: initialRows, total: initialTotal } : null,
   })
   const cacheRef = useRef(cache)
   useEffect(() => {
      cacheRef.current = cache
   }, [cache])

   const [loading, setLoading] = useState<RelatedCatalogModel | null>(null)
   const [loadingMore, setLoadingMore] = useState<RelatedCatalogModel | null>(null)
   const [error, setError] = useState<string | null>(null)

   const ensureLoaded = useCallback(async (model: OrganismRelatedModel) => {
      if (cacheRef.current[model] != null) return
      setError(null)
      setLoading(model)
      try {
         const { data, total } = await fetchOrganismRelatedWithTotal(taxid, model, {
            limit: 200,
            offset: 0,
         })
         setCache((prev) => ({ ...prev, [model]: { data, total } }))
      } catch (e) {
         const msg = e instanceof Error ? e.message : String(e)
         setError(msg)
      } finally {
         setLoading(null)
      }
   }, [taxid])

   const loadMore = useCallback(
      async (model: OrganismRelatedModel) => {
         const cached = cacheRef.current[model]
         if (!cached || cached.data.length >= cached.total) return
         setLoadingMore(model)
         try {
            const { data, total } = await fetchOrganismRelatedWithTotal(taxid, model, {
               limit: 200,
               offset: cached.data.length,
            })
            setCache((prev) => {
               const cur = prev[model]
               if (!cur) return prev
               return {
                  ...prev,
                  [model]: {
                     data: [...cur.data, ...data],
                     total,
                  },
               }
            })
         } finally {
            setLoadingMore(null)
         }
      },
      [taxid],
   )

   const modelLabel = useMemo(
      () => (k: DataModels) => labelForCatalogModel(k, config?.models, locale, t),
      [config?.models, locale, t],
   )

   const handleSelectModel = (model: OrganismRelatedModel) => {
      setDetailRow(null)
      setActiveModel(model)
      void ensureLoaded(model)
   }

   const cached = cache[activeModel]
   const loadingModel = loading === activeModel && cached == null
   const rows = cached?.data ?? []
   const showDetail = detailRow != null

   return (
      <div className="mt-6 space-y-4">
         <div className="w-full min-w-0">
            <div
               className="w-full min-w-0 overflow-x-auto"
               role="tablist"
               aria-label={t('speciesDetail.relatedRecordsTablist')}
            >
               <div className="flex w-max min-w-full gap-1 rounded-xl bg-muted/80 p-1 dark:bg-muted/60">
                  {visibleModels.map(({ key, count }) => {
                     const active = key === activeModel
                     return (
                        <button
                           key={key}
                           type="button"
                           role="tab"
                           aria-selected={active}
                           className={cn(
                              'flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-sm transition-all sm:px-3',
                              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                              active
                                 ? cn(
                                      'bg-background font-semibold text-foreground shadow-sm ring-1 ring-border/80',
                                      'dark:bg-card dark:text-foreground dark:shadow-md dark:ring-2 dark:ring-primary/55',
                                   )
                                 : 'font-medium text-muted-foreground hover:bg-muted/70 hover:text-foreground dark:hover:bg-muted/40',
                           )}
                           onClick={() => handleSelectModel(key)}
                        >
                           <ModelIcon
                              modelKey={key}
                              className={cn(
                                 'h-4 w-4 shrink-0',
                                 active ? 'text-primary' : 'text-muted-foreground',
                              )}
                           />
                           <span className="whitespace-nowrap">{modelLabel(key)}</span>
                           <Badge
                              variant={active ? 'default' : 'secondary'}
                              className="shrink-0 tabular-nums px-1.5 py-0 text-[10px]"
                           >
                              {count.toLocaleString()}
                           </Badge>
                        </button>
                     )
                  })}
               </div>
            </div>
         </div>

         {error ? <p className="text-sm text-destructive">{error}</p> : null}

         <div className="grid min-h-[12rem] grid-cols-1 gap-4">
            <div className="min-w-0 space-y-4">
               <CatalogRecordCardGrid
                  model={activeModel}
                  rows={rows}
                  loading={loadingModel}
                  loadingMore={loadingMore === activeModel}
                  total={cached?.total ?? 0}
                  onRowClick={(row) => setDetailRow(row)}
                  onLoadMore={() => void loadMore(activeModel)}
                  emptyMessage={t('catalog.tableEmpty')}
                  activeRow={detailRow}
               />
            </div>
            <CatalogRecordDetailSheet
               open={showDetail && detailRow != null}
               onOpenChange={(open) => {
                  if (!open) setDetailRow(null)
               }}
               catalogKey={activeModel}
               detailRow={detailRow}
               rootTaxid={rootTaxid}
               speciesHref={detailRow ? speciesHrefForRow(detailRow) : null}
               t={t}
            />
         </div>
      </div>
   )
}
