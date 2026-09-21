'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

import { CompactTaxonomicTree } from '@/components/compact-taxonomy-tree'
import { CitizenTaxonTree } from '@/components/citizen-taxon-tree'
import { TaxonomyBrowseModeToggle } from '@/components/taxonomy-browse-mode-toggle'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLocale } from '@/contexts/locale-context'
import { taxonRecordFromApi, type TaxonRecord } from '@/lib/api/taxon'
import { fetchTaxons } from '@/lib/api/taxons'
import {
   citizenNodeLabel,
   readStoredTaxonomyBrowseMode,
   writeStoredTaxonomyBrowseMode,
   type TaxonomyBrowseMode,
} from '@/lib/citizenTaxonomy'
import { ModelIcon } from '@/lib/modelIcons'
import type { CitizenTaxonomyConfig, CitizenTaxonomyNode, DataModels } from '@/lib/portal/types'
import { taxonNodeToPortalStats, type PortalStatRow } from '@/lib/portal/taxonNodeStats'
import { taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import { cn } from '@/lib/utils'
import { ChevronDown, ExternalLink, Loader2, Network, Search, X } from 'lucide-react'

const CATALOG_TAXON_SEARCH_INPUT_ID = 'catalog-taxon-scope-search'
const SEARCH_DEBOUNCE_MS = 280
/** Max rows shown after filtering to taxa with catalog data. */
const TYPEAHEAD_LIMIT = 18
/** Fetch extra so client-side filter (non-zero catalog counts) still fills the list. */
const TAXON_FETCH_LIMIT = 64
const MIN_QUERY_LEN = 2

function taxonDisplayName(row: Record<string, unknown>): string {
   const n = row.name ?? row.scientific_name
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

export type CatalogTaxonScopePopoverProps = {
   speciesTaxid: string | null
   citizenNodeId: string | null
   citizenTaxonomy: CitizenTaxonomyConfig | null
   scopedTaxonDoc: Record<string, unknown> | null
   scopedTaxonLoading: boolean
   scopedTaxonError: string | null
   catalogModelKeys: DataModels[]
   onSelectTaxon: (taxid: string, node: Record<string, unknown>) => void
   onSelectCitizenNode: (node: CitizenTaxonomyNode) => void
   onClearTaxon: () => void
   onBrowseModeChange?: (mode: TaxonomyBrowseMode) => void
}

export function CatalogTaxonScopePopover({
   speciesTaxid,
   citizenNodeId,
   citizenTaxonomy,
   scopedTaxonDoc,
   scopedTaxonLoading,
   scopedTaxonError,
   catalogModelKeys,
   onSelectTaxon,
   onSelectCitizenNode,
   onClearTaxon,
   onBrowseModeChange,
}: CatalogTaxonScopePopoverProps) {
   const { t, locale } = useLocale()
   const [open, setOpen] = useState(false)
   const [query, setQuery] = useState('')
   const [debouncedQuery, setDebouncedQuery] = useState('')
   const [searchLoading, setSearchLoading] = useState(false)
   const [searchRows, setSearchRows] = useState<Record<string, unknown>[]>([])
   const [searchError, setSearchError] = useState<string | null>(null)
   const seqRef = useRef(0)

   const hasCitizen = Boolean(citizenTaxonomy?.nodes?.length)
   const defaultMode: TaxonomyBrowseMode =
      citizenTaxonomy?.defaultMode === 'full' ? 'full' : 'citizen'
   const [browseMode, setBrowseMode] = useState<TaxonomyBrowseMode>(() =>
      hasCitizen ? readStoredTaxonomyBrowseMode(defaultMode) : 'full',
   )

   useEffect(() => {
      if (!hasCitizen) {
         setBrowseMode('full')
         return
      }
      setBrowseMode(readStoredTaxonomyBrowseMode(defaultMode))
   }, [hasCitizen, defaultMode])

   const handleBrowseModeChange = useCallback(
      (mode: TaxonomyBrowseMode) => {
         setBrowseMode(mode)
         writeStoredTaxonomyBrowseMode(mode)
         onBrowseModeChange?.(mode)
      },
      [onBrowseModeChange],
   )

   const showCitizen = hasCitizen && browseMode === 'citizen'
   const selectedCitizen = useMemo(() => {
      if (!citizenNodeId || !citizenTaxonomy) return null
      return citizenTaxonomy.nodes.find((n) => n.taxid === citizenNodeId) ?? null
   }, [citizenNodeId, citizenTaxonomy])

   const hasSelection = Boolean(speciesTaxid?.trim() || citizenNodeId?.trim())
   const showSearchResults = debouncedQuery.length >= MIN_QUERY_LEN

   const resetSearch = useCallback(() => {
      seqRef.current += 1
      setQuery('')
      setDebouncedQuery('')
      setSearchRows([])
      setSearchError(null)
      setSearchLoading(false)
   }, [])

   const handleOpenChange = useCallback(
      (next: boolean) => {
         setOpen(next)
         if (!next) resetSearch()
      },
      [resetSearch],
   )

   useEffect(() => {
      const tmr = window.setTimeout(() => setDebouncedQuery(query.trim()), SEARCH_DEBOUNCE_MS)
      return () => window.clearTimeout(tmr)
   }, [query])

   useEffect(() => {
      if (debouncedQuery.length < MIN_QUERY_LEN) {
         setSearchRows([])
         setSearchError(null)
         setSearchLoading(false)
         return
      }
      const seq = ++seqRef.current
      setSearchLoading(true)
      setSearchError(null)
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
            setSearchRows(filtered)
         })
         .catch(() => {
            if (seq !== seqRef.current) return
            setSearchRows([])
            setSearchError(t('catalog.taxonSearchError'))
         })
         .finally(() => {
            if (seq !== seqRef.current) return
            setSearchLoading(false)
         })
   }, [debouncedQuery, t, catalogModelKeys])

   const selectedLabel = useMemo(() => {
      if (selectedCitizen) return citizenNodeLabel(selectedCitizen, locale)
      if (!speciesTaxid?.trim()) return ''
      return taxonDisplayName(scopedTaxonDoc ?? { taxid: speciesTaxid })
   }, [selectedCitizen, speciesTaxid, scopedTaxonDoc, locale])

   const selectedIdDisplay = citizenNodeId?.trim() || speciesTaxid?.trim() || ''

   const selectedDetailsHref = useMemo(() => {
      if (selectedCitizen) {
         const q = selectedCitizen.include_taxid?.trim()
         if (q && /^[0-9]+$/.test(q)) return taxonomyTaxonHref(q)
         if (/^[0-9]+$/.test(selectedCitizen.taxid)) return taxonomyTaxonHref(selectedCitizen.taxid)
         return '/taxonomy'
      }
      const tid = speciesTaxid?.trim()
      if (!tid) return '#'
      if (taxonHasChildren(scopedTaxonDoc)) {
         return taxonomyTaxonHref(tid)
      }
      return `/species/${encodeURIComponent(tid)}`
   }, [selectedCitizen, speciesTaxid, scopedTaxonDoc])

   const treeSelectedTaxons = useMemo((): TaxonRecord[] => {
      if (!speciesTaxid?.trim() || citizenNodeId) return []
      if (scopedTaxonDoc) return [taxonRecordFromApi(scopedTaxonDoc)]
      return [
         {
            taxid: speciesTaxid.trim(),
            scientific_name: selectedLabel || speciesTaxid.trim(),
            name: selectedLabel || speciesTaxid.trim(),
            organisms_count: 0,
            assemblies_count: 0,
            annotations_count: 0,
         },
      ]
   }, [speciesTaxid, citizenNodeId, scopedTaxonDoc, selectedLabel])

   const handleTreeTaxonToggle = useCallback(
      (taxon: TaxonRecord) => {
         if (speciesTaxid === taxon.taxid && !citizenNodeId) {
            onClearTaxon()
            return
         }
         onSelectTaxon(taxon.taxid, taxon as unknown as Record<string, unknown>)
         resetSearch()
         setOpen(false)
      },
      [speciesTaxid, citizenNodeId, onClearTaxon, onSelectTaxon, resetSearch],
   )

   const handleCitizenSelect = useCallback(
      (node: CitizenTaxonomyNode) => {
         if (citizenNodeId === node.taxid) {
            onClearTaxon()
            return
         }
         onSelectCitizenNode(node)
         resetSearch()
         setOpen(false)
      },
      [citizenNodeId, onClearTaxon, onSelectCitizenNode, resetSearch],
   )

   const onPickSearchHit = useCallback(
      (row: Record<string, unknown>) => {
         const tid = String(row.taxid ?? '').trim()
         if (!tid) return
         onSelectTaxon(tid, row)
         resetSearch()
         setOpen(false)
      },
      [onSelectTaxon, resetSearch],
   )

   return (
      <div className="min-w-0 shrink-0">
         <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
               <Button
                  type="button"
                  variant="outline"
                  className={cn(
                     'h-10 max-w-full gap-2 px-3',
                     hasSelection &&
                        'border-primary bg-primary/10 text-foreground ring-1 ring-primary/25 dark:bg-primary/15',
                  )}
                  aria-label={t('catalog.taxonScopeButtonAria')}
                  aria-expanded={open}
               >
                  <Network className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                  {scopedTaxonLoading ? (
                     <span className="inline-flex min-w-0 items-center gap-2 truncate text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                        {t('catalog.taxonScopeLoading')}
                     </span>
                  ) : hasSelection ? (
                     <span className="min-w-0 truncate">
                        <span className="font-medium">{selectedLabel}</span>
                        <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                           ({selectedIdDisplay})
                        </span>
                     </span>
                  ) : (
                     <span className="truncate text-muted-foreground">
                        {t('catalog.taxonScopeButtonAll')}
                     </span>
                  )}
                  <ChevronDown
                     className={cn(
                        'ml-auto h-4 w-4 shrink-0 opacity-60 transition-transform',
                        open && 'rotate-180',
                     )}
                     aria-hidden
                  />
               </Button>
            </PopoverTrigger>

            <PopoverContent
               align="start"
               className="w-[min(100vw-2rem,22rem)] p-0"
               sideOffset={6}
            >
               <div className="space-y-2 border-b border-border px-3 py-2.5">
                  {hasSelection ? (
                     <div className="flex min-w-0 items-center gap-2">
                        <div className="min-w-0 flex-1">
                           <p className="truncate text-sm font-semibold leading-tight">
                              {scopedTaxonLoading ? (
                                 <span className="inline-flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />
                                    {t('catalog.taxonScopeLoading')}
                                 </span>
                              ) : (
                                 <>
                                    <span>{selectedLabel}</span>
                                    <span className="ml-1.5 font-normal tabular-nums text-muted-foreground">
                                       ({selectedIdDisplay})
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
                  ) : (
                     <p className="text-xs text-muted-foreground">{t('catalog.taxonScopeBrowseHint')}</p>
                  )}
               </div>

               <div className="flex h-[min(60vh,22rem)] min-h-0 flex-col gap-2 overflow-hidden p-2">
                  <div className="relative shrink-0">
                     <label htmlFor={CATALOG_TAXON_SEARCH_INPUT_ID} className="sr-only">
                        {t('catalog.taxonSearchLabel')}
                     </label>
                     <Search
                        className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                     />
                     <Input
                        id={CATALOG_TAXON_SEARCH_INPUT_ID}
                        className="h-9 pl-8 text-sm"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder={t('catalog.taxonSearchPlaceholder')}
                        autoComplete="off"
                        aria-autocomplete="list"
                        aria-expanded={showSearchResults}
                        aria-controls="catalog-taxon-scope-search-listbox"
                     />
                  </div>
                  {hasCitizen ? (
                     <TaxonomyBrowseModeToggle
                        mode={browseMode}
                        onModeChange={handleBrowseModeChange}
                     />
                  ) : null}

                  <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border">
                     {showSearchResults ? (
                        <ScrollArea className="min-h-0 flex-1">
                           <div
                              id="catalog-taxon-scope-search-listbox"
                              role="listbox"
                              aria-label={t('catalog.taxonSearchLabel')}
                           >
                              {searchLoading ? (
                                 <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                                    {t('catalog.taxonSearchLoading')}
                                 </div>
                              ) : searchError ? (
                                 <p className="px-3 py-3 text-sm text-destructive" role="alert">
                                    {searchError}
                                 </p>
                              ) : searchRows.length === 0 ? (
                                 <p className="px-3 py-3 text-sm text-muted-foreground">
                                    {t('catalog.taxonSearchNoResults')}
                                 </p>
                              ) : (
                                 <ul className="p-1">
                                    {searchRows.map((row) => {
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
                                                onClick={() => onPickSearchHit(row)}
                                             >
                                                <div className="min-w-0 flex-1 truncate">
                                                   <span className="font-medium text-foreground">
                                                      {name}
                                                   </span>
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
                           </div>
                        </ScrollArea>
                     ) : showCitizen && citizenTaxonomy ? (
                        <CitizenTaxonTree
                           nodes={citizenTaxonomy.nodes}
                           selectedId={citizenNodeId}
                           onSelect={handleCitizenSelect}
                        />
                     ) : (
                        <CompactTaxonomicTree
                           variant="root"
                           selectedTaxons={treeSelectedTaxons}
                           onTaxonToggle={handleTreeTaxonToggle}
                           selectionMode="single"
                           fillContainer
                        />
                     )}
                  </div>
               </div>
            </PopoverContent>
         </Popover>

         {scopedTaxonError ? (
            <p className="mt-2 text-xs text-destructive" role="alert">
               {scopedTaxonError}
            </p>
         ) : null}
      </div>
   )
}
