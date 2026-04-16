'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { CatalogFilterCollapsible } from '@/components/catalog-explorer/catalog-filter-collapsible'
import { catalogFilterSectionId } from '@/components/catalog-explorer/catalog-filter-accordion-context'
import { useLocale } from '@/contexts/locale-context'
import { fetchOrganisms } from '@/lib/api/organisms'
import type { DataModels } from '@/lib/portal/types'
import { cn } from '@/lib/utils'
import { Check, Loader2 } from 'lucide-react'

const PAGE = 40

function catalogCountQuery(catalogKey: DataModels): Record<string, string | number> {
   switch (catalogKey) {
      case 'biosamples':
         return { biosamples_count__gt: 0, sort_column: 'biosamples_count', sort_order: 'desc' }
      case 'reads':
         return { reads_count__gt: 0, sort_column: 'reads_count', sort_order: 'desc' }
      case 'assemblies':
         return { assemblies_count__gt: 0, sort_column: 'assemblies_count', sort_order: 'desc' }
      case 'annotations':
         return {
            genome_annotations_count__gt: 0,
            sort_column: 'genome_annotations_count',
            sort_order: 'desc',
         }
      case 'local_samples':
         return { local_samples_count__gt: 0, sort_column: 'local_samples_count', sort_order: 'desc' }
      default:
         return { sort_column: 'taxid', sort_order: 'desc' }
   }
}

function countFieldForCatalog(catalogKey: DataModels): string {
   switch (catalogKey) {
      case 'biosamples':
         return 'biosamples_count'
      case 'reads':
         return 'reads_count'
      case 'assemblies':
         return 'assemblies_count'
      case 'annotations':
         return 'genome_annotations_count'
      case 'local_samples':
         return 'local_samples_count'
      default:
         return 'taxid'
   }
}

const SPECIES_SECTION_ID = catalogFilterSectionId('species')

export function CatalogSpeciesFilterSection(options: {
   catalogKey: DataModels
   selectedTaxid: string | null
   onSelectTaxid: (taxid: string | null) => void
}) {
   const { catalogKey, selectedTaxid, onSelectTaxid } = options
   const { t } = useLocale()
   const [rows, setRows] = useState<Record<string, unknown>[]>([])
   const [total, setTotal] = useState(0)
   const [loading, setLoading] = useState(false)
   const sentinelRef = useRef<HTMLDivElement | null>(null)

   const baseParams = useMemo(() => catalogCountQuery(catalogKey), [catalogKey])
   const countField = useMemo(() => countFieldForCatalog(catalogKey), [catalogKey])

   const fetchAt = useCallback(
      async (start: number, append: boolean) => {
         setLoading(true)
         try {
            const { data, total: tot } = await fetchOrganisms({
               ...baseParams,
               limit: PAGE,
               offset: start,
               fields: ['scientific_name', 'taxid', 'insdc_common_name', countField].join(','),
            })
            setTotal(tot)
            if (append) {
               setRows((prev) => [...prev, ...data])
            } else {
               setRows(data)
            }
         } catch {
            if (!append) setRows([])
         } finally {
            setLoading(false)
         }
      },
      [baseParams, countField],
   )

   useEffect(() => {
      void fetchAt(0, false)
   }, [fetchAt])

   const loadMore = useCallback(() => {
      if (loading) return
      if (rows.length >= total) return
      void fetchAt(rows.length, true)
   }, [fetchAt, loading, rows.length, total])

   useEffect(() => {
      const el = sentinelRef.current
      if (!el) return
      const obs = new IntersectionObserver(
         (entries) => {
            const hit = entries.some((e) => e.isIntersecting)
            if (hit) loadMore()
         },
         { root: null, rootMargin: '80px', threshold: 0 },
      )
      obs.observe(el)
      return () => obs.disconnect()
   }, [loadMore])

   const title = t('catalog.speciesFilterTitle')

   return (
      <CatalogFilterCollapsible
         sectionId={SPECIES_SECTION_ID}
         title={title}
         isActive={Boolean(selectedTaxid?.trim())}
         clearLabel={t('catalog.clearThisFilter')}
         onReset={() => onSelectTaxid(null)}
      >
         <div
            className="max-h-[min(50vh,22rem)] space-y-0.5 overflow-y-auto overscroll-contain py-1"
            role="listbox"
            aria-label={title}
         >
            <button
               type="button"
               role="option"
               aria-selected={!selectedTaxid}
               className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                  !selectedTaxid && 'bg-muted',
               )}
               onClick={() => onSelectTaxid(null)}
            >
               <Check className={cn('h-4 w-4 shrink-0', !selectedTaxid ? 'opacity-100' : 'opacity-0')} />
               <span className="min-w-0 flex-1 font-medium">{t('common.all')}</span>
            </button>
            {rows.map((row) => {
               const tid = String(row.taxid ?? '').trim()
               const name = String(row.scientific_name ?? row.insdc_common_name ?? tid)
               const cnLabel = row.insdc_common_name != null ? String(row.insdc_common_name) : ''
               const cnt = row[countField]
               const sel = selectedTaxid === tid
               return (
                  <button
                     key={tid || name}
                     type="button"
                     role="option"
                     aria-selected={sel}
                     className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted/80',
                        sel && 'bg-muted',
                     )}
                     onClick={() => onSelectTaxid(tid || null)}
                  >
                     <Check className={cn('h-4 w-4 shrink-0', sel ? 'opacity-100' : 'opacity-0')} />
                     <span className="min-w-0 flex-1 truncate" title={name}>
                        {name}
                        {cnLabel && cnLabel !== name ? (
                           <span className="text-muted-foreground"> ({cnLabel})</span>
                        ) : null}
                     </span>
                     {typeof cnt === 'number' ? (
                        <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                           {cnt.toLocaleString()}
                        </span>
                     ) : null}
                  </button>
               )
            })}
            <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
            {loading ? (
               <div className="flex justify-center py-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" aria-label={t('common.loading')} />
               </div>
            ) : null}
         </div>
      </CatalogFilterCollapsible>
   )
}
