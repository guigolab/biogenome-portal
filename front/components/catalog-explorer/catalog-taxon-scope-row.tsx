'use client'

import type { ReactNode } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLocale } from '@/contexts/locale-context'
import { fetchTaxons } from '@/lib/api/taxons'
import type { DataModels } from '@/lib/portal/types'
import { taxonNodeToPortalStats, type PortalStatRow } from '@/lib/portal/taxonNodeStats'
import { taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import { cn } from '@/lib/utils'
import { ModelIcon } from '@/lib/modelIcons'
import { ExternalLink, Loader2, Search, X } from 'lucide-react'
import Link from 'next/link'

export const CATALOG_TAXON_SEARCH_INPUT_ID = 'catalog-taxon-search'

const SEARCH_DEBOUNCE_MS = 280
/** Max rows shown after filtering to taxa with catalog data. */
const TYPEAHEAD_LIMIT = 18
/** Fetch extra so client-side filter (non-zero catalog counts) still fills the list. */
const TAXON_FETCH_LIMIT = 64
const MIN_QUERY_LEN = 2

function taxonDisplayName(row: Record<string, unknown>): string {
   const n = row.name
   return typeof n === 'string' && n.trim() ? n.trim() : String(row.taxid ?? '')
}

function nonZeroStatsForCatalogs(
   row: Record<string, unknown>,
   catalogModelKeys: DataModels[],
): PortalStatRow[] {
   return taxonNodeToPortalStats(row).filter((s) => s.count > 0 && catalogModelKeys.includes(s.key))
}

function hasAnyCatalogCount(row: Record<string, unknown>, catalogModelKeys: DataModels[]): boolean {
   return taxonNodeToPortalStats(row).some((s) => catalogModelKeys.includes(s.key) && s.count > 0)
}

function taxonHasChildren(row: Record<string, unknown> | null): boolean {
   if (!row) return false
   const raw = row.children
   return Array.isArray(raw) && raw.length > 0
}

export type CatalogTaxonScopeRowProps = {
   speciesTaxid: string | null
   scopedTaxonDoc: Record<string, unknown> | null
   scopedTaxonLoading: boolean
   scopedTaxonError: string | null
   catalogModelKeys: DataModels[]
   onSelectTaxon: (taxid: string, node: Record<string, unknown>) => void
   onClearTaxon: () => void
   /** Catalog model tabs — same row as search + selection (e.g. right-aligned). */
   endSlot?: ReactNode
}

export function CatalogTaxonScopeRow({
   speciesTaxid,
   scopedTaxonDoc,
   scopedTaxonLoading,
   scopedTaxonError,
   catalogModelKeys,
   onSelectTaxon,
   onClearTaxon,
   endSlot,
}: CatalogTaxonScopeRowProps) {
   const { t } = useLocale()
   const [query, setQuery] = useState('')
   const [debouncedQuery, setDebouncedQuery] = useState('')
   const [open, setOpen] = useState(false)
   const [loading, setLoading] = useState(false)
   const [rows, setRows] = useState<Record<string, unknown>[]>([])
   const [fetchError, setFetchError] = useState<string | null>(null)
   const seqRef = useRef(0)
   const rootRef = useRef<HTMLDivElement | null>(null)

   useEffect(() => {
      const tmr = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS)
      return () => window.clearTimeout(tmr)
   }, [query])

   useEffect(() => {
      if (debouncedQuery.length < MIN_QUERY_LEN) {
         setRows([])
         setFetchError(null)
         setLoading(false)
         return
      }
      const seq = ++seqRef.current
      setLoading(true)
      setFetchError(null)
      void fetchTaxons({
         filter: debouncedQuery,
         limit: TAXON_FETCH_LIMIT,
         offset: 0,
         sort_column: 'name',
         sort_order: 'asc',
      })
         .then((res) => {
            if (seq !== seqRef.current) return
            const filtered = res.data
               .filter((row) => hasAnyCatalogCount(row as Record<string, unknown>, catalogModelKeys))
               .slice(0, TYPEAHEAD_LIMIT)
            setRows(filtered)
         })
         .catch(() => {
            if (seq !== seqRef.current) return
            setRows([])
            setFetchError(t('catalog.taxonSearchError'))
         })
         .finally(() => {
            if (seq !== seqRef.current) return
            setLoading(false)
         })
   }, [debouncedQuery, t, catalogModelKeys])

   useEffect(() => {
      function onDocMouseDown(e: MouseEvent) {
         const el = rootRef.current
         if (!el?.contains(e.target as Node)) setOpen(false)
      }
      document.addEventListener('mousedown', onDocMouseDown)
      return () => document.removeEventListener('mousedown', onDocMouseDown)
   }, [])

   const showDropdown = open && debouncedQuery.length >= MIN_QUERY_LEN

   const selectedLabel = useMemo(() => {
      if (!speciesTaxid?.trim()) return ''
      return taxonDisplayName(scopedTaxonDoc ?? { taxid: speciesTaxid })
   }, [speciesTaxid, scopedTaxonDoc])

   const selectedDetailsHref = useMemo(() => {
      const tid = speciesTaxid?.trim()
      if (!tid) return '#'
      if (taxonHasChildren(scopedTaxonDoc)) {
         return taxonomyTaxonHref(tid)
      }
      return `/species/${encodeURIComponent(tid)}`
   }, [speciesTaxid, scopedTaxonDoc])

   const onPick = useCallback(
      (row: Record<string, unknown>) => {
         const tid = String(row.taxid ?? '').trim()
         if (!tid) return
         onSelectTaxon(tid, row)
         setQuery('')
         setDebouncedQuery('')
         setOpen(false)
         setRows([])
      },
      [onSelectTaxon],
   )

   return (
      <div ref={rootRef} className="w-full min-w-0">
         <div
            className={cn(
               'flex w-full min-w-0 flex-col gap-3',
               'md:flex-row md:items-center md:gap-3',
            )}
         >
            <div className="relative min-h-10 w-full min-w-0 md:max-w-lg md:flex-1">
               <label htmlFor={CATALOG_TAXON_SEARCH_INPUT_ID} className="sr-only">
                  {t('catalog.taxonSearchLabel')}
               </label>
               <div className="relative">
                  <Search
                     className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                     aria-hidden
                  />
                  <Input
                     id={CATALOG_TAXON_SEARCH_INPUT_ID}
                     className="h-10 pl-9"
                     value={query}
                     onChange={(e) => {
                        setQuery(e.target.value)
                        setOpen(true)
                     }}
                     onFocus={() => setOpen(true)}
                     placeholder={t('catalog.taxonSearchPlaceholder')}
                     autoComplete="off"
                     aria-autocomplete="list"
                     aria-expanded={showDropdown}
                     aria-controls="catalog-taxon-search-listbox"
                  />
               </div>
               {showDropdown ? (
                  <div
                     id="catalog-taxon-search-listbox"
                     role="listbox"
                     className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md"
                  >
                     <ScrollArea className="max-h-[min(50vh,20rem)]">
                        {loading ? (
                           <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                              {t('catalog.taxonSearchLoading')}
                           </div>
                        ) : fetchError ? (
                           <p className="px-3 py-3 text-sm text-destructive" role="alert">
                              {fetchError}
                           </p>
                        ) : rows.length === 0 ? (
                           <p className="px-3 py-3 text-sm text-muted-foreground">
                              {t('catalog.taxonSearchNoResults')}
                           </p>
                        ) : (
                           <ul className="p-1">
                              {rows.map((row) => {
                                 const tid = String(row.taxid ?? '')
                                 const name = taxonDisplayName(row)
                                 const stats = nonZeroStatsForCatalogs(row, catalogModelKeys)
                                 return (
                                    <li key={tid} role="none">
                                       <button
                                          type="button"
                                          role="option"
                                          className={cn(
                                             'flex w-full min-w-0 items-center justify-between gap-3 rounded-sm px-2 py-2 text-left text-sm',
                                             'hover:bg-accent focus-visible:bg-accent focus-visible:outline-none',
                                          )}
                                          onMouseDown={(e) => e.preventDefault()}
                                          onClick={() => onPick(row)}
                                       >
                                          <div className="min-w-0 flex-1 truncate">
                                             <span className="font-medium text-foreground">{name}</span>
                                             <span className="ml-1.5 tabular-nums text-xs text-muted-foreground">
                                                {tid}
                                             </span>
                                          </div>
                                          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                                             {stats.map((s) => (
                                                <span
                                                   key={s.key}
                                                   className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground"
                                                   title={s.key}
                                                >
                                                   <ModelIcon
                                                      modelKey={s.key}
                                                      className="h-3 w-3 shrink-0 opacity-80"
                                                   />
                                                   {s.count.toLocaleString()}
                                                </span>
                                             ))}
                                          </div>
                                       </button>
                                    </li>
                                 )
                              })}
                           </ul>
                        )}
                     </ScrollArea>
                  </div>
               ) : null}
            </div>

            {speciesTaxid?.trim() ? (
               <div
                  className={cn(
                     'flex min-h-10 w-full min-w-0 max-w-full items-center gap-2 rounded-lg border-2 border-primary bg-primary/10 px-3 py-1 shadow-sm md:w-auto md:max-w-[min(100%,22rem)] md:shrink-0',
                     'ring-1 ring-primary/25 dark:bg-primary/15',
                     scopedTaxonLoading && 'opacity-95',
                  )}
                  role="status"
                  aria-current="true"
               >
                  <div className="min-w-0 flex-1">
                     <p className="truncate text-sm font-semibold leading-tight text-foreground">
                        {scopedTaxonLoading ? (
                           <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                              {t('catalog.taxonScopeLoading')}
                           </span>
                        ) : (
                           <>
                              <span className="text-foreground">{selectedLabel}</span>
                              <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                                 ({speciesTaxid.trim()})
                              </span>
                           </>
                        )}
                     </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                     <Button type="button" variant="secondary" size="icon" className="h-8 w-8" asChild>
                        <Link
                           href={selectedDetailsHref}
                           title={t('catalog.taxonScopeViewInTaxonomy')}
                        >
                           <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                           <span className="sr-only">{t('catalog.taxonScopeViewInTaxonomy')}</span>
                        </Link>
                     </Button>
                     <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
                        onClick={onClearTaxon}
                        title={t('catalog.taxonScopeClear')}
                     >
                        <X className="h-3.5 w-3.5" aria-hidden />
                        <span className="sr-only">{t('catalog.taxonScopeClear')}</span>
                     </Button>
                  </div>
               </div>
            ) : null}

            {endSlot ? (
               <div className="flex w-full min-w-0 shrink-0 justify-stretch md:ml-auto md:w-auto md:justify-end">
                  {endSlot}
               </div>
            ) : null}
         </div>

         {scopedTaxonError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
               {scopedTaxonError}
            </p>
         ) : null}
      </div>
   )
}
