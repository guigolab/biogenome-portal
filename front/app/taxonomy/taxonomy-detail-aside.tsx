'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SpeciesCard } from '@/components/species-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/contexts/locale-context'
import { usePortalConfig } from '@/contexts/portal-context'
import { downloadOrganismsTsv, fetchOrganisms } from '@/lib/api/organisms'
import { ModelIcon } from '@/lib/modelIcons'
import { navRouteIcons } from '@/lib/portal'
import type { DataModels } from '@/lib/portal/types'
import { findSubtree } from '@/lib/taxonomy/treeFilter'
import { catalogTaxonHref, taxonomyTaxonHref } from '@/lib/taxonomyLinks'
import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'
import type { FlatTreeNode, TreeTableRow } from '@/lib/taxonomy/treeTableTypes'
import { formatRankFilterLabel } from '@/lib/taxonomy/treeRankOptions'
import { cn } from '@/lib/utils'
import { ArrowLeft, ChevronRight, Download, Loader2, MapPin, TreePine } from 'lucide-react'

const PAGE_SIZE = 21

const SPECIES_EXPORT_FIELDS = ['scientific_name', 'taxid', 'insdc_common_name'] as const

const KPI_MODELS: { model: DataModels; pick: (n: FlatTreeNode) => number }[] = [
   { model: 'organisms', pick: (n) => n.organisms_count },
   { model: 'assemblies', pick: (n) => n.assemblies_count },
   { model: 'biosamples', pick: (n) => n.biosamples_count },
   { model: 'reads', pick: (n) => n.reads_count },
   { model: 'annotations', pick: (n) => n.annotations_count },
   { model: 'local_samples', pick: (n) => n.local_samples_count },
]

type TreeLoadStatus = 'idle' | 'loading' | 'success' | 'error'

export type TaxonomyDetailAsideProps = {
   selectedTaxid: string
   effectiveTreeRoot: string
   treeLoadStatus: TreeLoadStatus
   onSelectTaxon: (taxid: string | null) => void
   /** Re-root tree on this taxon; URL `taxid` preserved (aside stays open). */
   onExploreLineage: (taxid: string) => void
   nestedTree: NestedTaxonNode | null
   byTaxid: Map<string, FlatTreeNode>
   rowByTaxid: Map<string, TreeTableRow>
}

export function TaxonomyDetailAside({
   selectedTaxid,
   effectiveTreeRoot,
   treeLoadStatus,
   onSelectTaxon,
   onExploreLineage,
   nestedTree,
   byTaxid,
   rowByTaxid,
}: TaxonomyDetailAsideProps) {
   const { t } = useLocale()
   const { raw: portalRaw } = usePortalConfig()
   const CatalogIcon = navRouteIcons.catalog
   const goatActive =
      portalRaw?.general && typeof portalRaw.general === 'object'
         ? (portalRaw.general as { goat?: boolean }).goat === true
         : false
   const [organismItems, setOrganismItems] = useState<Record<string, unknown>[]>([])
   const [organismTotal, setOrganismTotal] = useState(0)
   const [organismLoading, setOrganismLoading] = useState(false)
   const [organismLoadingMore, setOrganismLoadingMore] = useState(false)
   const [organismError, setOrganismError] = useState<string | null>(null)
   const [downloadLoading, setDownloadLoading] = useState(false)
   const [childFilter, setChildFilter] = useState('')

   const loadMoreInFlightRef = useRef(false)
   const listScrollRef = useRef<HTMLDivElement>(null)
   const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

   const selectedRow = byTaxid.get(selectedTaxid) ?? null
   const selectedTableRow = rowByTaxid.get(selectedTaxid) ?? null
   const parentRow = useMemo(() => {
      const pid = selectedTableRow?.parent_taxid?.trim()
      if (!pid) return null
      return rowByTaxid.get(pid) ?? null
   }, [rowByTaxid, selectedTableRow])

   const selectedNested = useMemo((): NestedTaxonNode | null => {
      if (!nestedTree) return null
      return findSubtree(nestedTree, selectedTaxid)
   }, [nestedTree, selectedTaxid])

   const childNodes = selectedNested?.children ?? []
   const hasChildren = childNodes.length > 0
   /** No child taxa in loaded tree — species-level leaf for navigation purposes. */
   const isSpeciesLeaf = !hasChildren
   const selectedDetailsHref = isSpeciesLeaf
      ? `/species/${encodeURIComponent(selectedTaxid)}`
      : taxonomyTaxonHref(selectedTaxid)
   const atTreeRoot = selectedTaxid.trim() === effectiveTreeRoot.trim()
   const showExploreLineage = !atTreeRoot && hasChildren

   const displayName = (selectedRow?.scientific_name || selectedTaxid).replace(/_/g, ' ')
   const rankLabel =
      formatRankFilterLabel((selectedTableRow?.rank ?? selectedRow?.rank ?? '').trim()) || null

   const kpiItems = useMemo(() => {
      if (!selectedRow) return []
      return KPI_MODELS.filter(({ pick }) => pick(selectedRow) > 0)
   }, [selectedRow])

   const treeLoading = treeLoadStatus === 'idle' || treeLoadStatus === 'loading'
   const treeReady = treeLoadStatus === 'success'
   const treeFailed = treeLoadStatus === 'error'

   const loadOrganisms = useCallback(
      async (offset: number, append: boolean) => {
         if (append) setOrganismLoadingMore(true)
         else setOrganismLoading(true)
         setOrganismError(null)
         try {
            const { data, total: tot } = await fetchOrganisms({
               taxon_lineage: selectedTaxid,
               limit: PAGE_SIZE,
               offset,
            })
            if (append) {
               setOrganismItems((prev) => [...prev, ...data])
               setOrganismTotal(tot)
            } else {
               setOrganismItems(data)
               setOrganismTotal(tot)
            }
         } catch (e) {
            if (!append) {
               setOrganismItems([])
               setOrganismTotal(0)
            }
            setOrganismError(e instanceof Error ? e.message : t('taxonomy.detail.failedToLoadOrganisms'))
         } finally {
            if (append) setOrganismLoadingMore(false)
            else setOrganismLoading(false)
         }
      },
      [selectedTaxid, t],
   )

   useEffect(() => {
      if (!selectedRow) return
      setOrganismItems([])
      setOrganismTotal(0)
      setOrganismError(null)
      setChildFilter('')
      void loadOrganisms(0, false)
   }, [selectedTaxid, selectedRow, loadOrganisms])

   const loadMoreOrganisms = useCallback(async () => {
      if (organismLoadingMore || organismLoading || loadMoreInFlightRef.current) return
      const offset = organismItems.length
      if (offset >= organismTotal) return
      loadMoreInFlightRef.current = true
      try {
         await loadOrganisms(offset, true)
      } finally {
         loadMoreInFlightRef.current = false
      }
   }, [
      loadOrganisms,
      organismItems.length,
      organismLoading,
      organismLoadingMore,
      organismTotal,
   ])

   const loadMoreOrganismsRef = useRef(loadMoreOrganisms)
   loadMoreOrganismsRef.current = loadMoreOrganisms

   useEffect(() => {
      const root = listScrollRef.current
      const target = loadMoreSentinelRef.current
      if (!root || !target) return

      const obs = new IntersectionObserver(
         (entries) => {
            if (!entries[0]?.isIntersecting) return
            void loadMoreOrganismsRef.current()
         },
         { root, rootMargin: '120px', threshold: 0 },
      )
      obs.observe(target)
      return () => obs.disconnect()
   }, [selectedTaxid, organismItems.length, organismTotal])

   const buildOrganismExportQuery = useCallback((): Record<string, string | number | undefined> => {
      return { taxon_lineage: selectedTaxid }
   }, [selectedTaxid])

   const onDownloadSpeciesTsv = useCallback(async () => {
      setDownloadLoading(true)
      try {
         const blob = await downloadOrganismsTsv(buildOrganismExportQuery(), [...SPECIES_EXPORT_FIELDS])
         const href = URL.createObjectURL(blob)
         const link = document.createElement('a')
         link.href = href
         const safeName = (selectedRow?.scientific_name || selectedTaxid).replace(/[^\w.-]+/g, '_')
         link.setAttribute('download', `${safeName}_organisms.tsv`)
         document.body.appendChild(link)
         link.click()
         document.body.removeChild(link)
         URL.revokeObjectURL(href)
      } catch (e) {
         setOrganismError(e instanceof Error ? e.message : t('taxonomy.detail.downloadFailed'))
      } finally {
         setDownloadLoading(false)
      }
   }, [buildOrganismExportQuery, selectedTaxid, selectedRow?.scientific_name, t])

   if (treeLoading && !selectedRow) {
      return (
         <div className="bg-card flex h-full min-h-0 flex-col overflow-hidden">
            <div className="border-border shrink-0 border-b px-3 pt-2.5 pb-2">
               <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  onClick={() => onSelectTaxon(null)}
                  className="text-muted-foreground h-8 w-8 shrink-0"
                  aria-label={t('taxonomy.detail.clearSelection')}
               >
                  <ArrowLeft className="h-4 w-4" />
               </Button>
            </div>
            <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-8">
               <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
               <p className="text-sm">{t('taxonomy.tree.loadingTreeData')}</p>
            </div>
         </div>
      )
   }

   if (treeFailed) {
      return (
         <div className="bg-card flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
               <p className="text-destructive text-sm">{t('taxonomy.tree.unableToLoad')}</p>
               <Button type="button" variant="outline" size="sm" onClick={() => onSelectTaxon(null)}>
                  {t('taxonomy.detail.clearSelection')}
               </Button>
            </div>
         </div>
      )
   }

   if (treeReady && !selectedRow) {
      return (
         <div className="bg-card flex h-full min-h-0 flex-col overflow-hidden">
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
               <p className="text-muted-foreground text-sm">{t('taxonomy.detail.taxonNotInTree')}</p>
               <Button type="button" variant="secondary" size="sm" onClick={() => onSelectTaxon(null)}>
                  {t('taxonomy.detail.clearTaxonFromUrl')}
               </Button>
            </div>
         </div>
      )
   }

   if (!selectedRow) {
      return null
   }

   return (
      <div className="bg-card text-card-foreground flex h-full min-h-0 flex-col overflow-hidden border-border">
         <div className="border-border shrink-0 space-y-2.5 border-b px-3 pt-2.5 pb-3">
            <Button
               variant="ghost"
               size="icon"
               onClick={() => onSelectTaxon(null)}
               className="text-muted-foreground h-8 w-8 shrink-0"
               aria-label={t('taxonomy.detail.clearSelection')}
            >
               <ArrowLeft className="h-4 w-4" />
            </Button>

            <nav
               className="animate-in fade-in-0 slide-in-from-bottom-1 duration-200"
               aria-label={t('taxonomy.detail.navigateAria')}
               key={selectedTaxid}
            >
               <p className="text-muted-foreground mb-1.5 text-[0.62rem] font-medium tracking-[0.12em] uppercase">
                  {t('taxonomy.detail.navigateGuide')}
               </p>
               <div className="border-border/60 bg-muted/20 rounded-lg border p-2 text-sm">
                  <div className="space-y-0">
                     {parentRow ? (
                        <div className="flex gap-1.5">
                           <div className="flex w-5 shrink-0 flex-col items-center pt-px" aria-hidden>
                              <span className="bg-muted-foreground/60 ring-background size-2 shrink-0 rounded-full ring-1" />
                              <div className="bg-border mt-0.5 min-h-[8px] w-px flex-1" />
                           </div>
                           <button
                              type="button"
                              className="text-muted-foreground hover:text-primary min-w-0 flex-1 rounded py-0.5 text-left text-[0.7rem] leading-tight transition-colors"
                              onClick={() => onSelectTaxon(parentRow.taxid)}
                           >
                              <span className="line-clamp-2">
                                 {(parentRow.name || parentRow.taxid).replace(/_/g, ' ')}
                              </span>
                           </button>
                        </div>
                     ) : null}

                     <div className="flex gap-1.5">
                        <div className="flex w-5 shrink-0 flex-col items-center" aria-hidden>
                           {parentRow ? <div className="bg-border h-0.5 w-px shrink-0" /> : null}
                           <MapPin className="text-primary size-4 shrink-0" />
                           {hasChildren ? (
                              <div className="bg-border mt-0.5 min-h-[10px] w-px flex-1" />
                           ) : null}
                        </div>
                        <div className="border-primary/45 bg-background/80 min-w-0 flex-1 rounded-md border border-l-2 border-l-primary px-2 py-1.5">
                           <div className="flex min-w-0 items-start justify-between gap-1.5">
                              <div className="text-foreground min-w-0 flex-1 text-sm leading-snug font-semibold">{displayName}</div>
                              <Badge
                                 variant="secondary"
                                 className="mt-0.5 shrink-0 px-1 py-0 text-[0.6rem] font-medium"
                              >
                                 {t('taxonomy.detail.selectedMarker')}
                              </Badge>
                           </div>
                           <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[0.65rem]">
                              {rankLabel ? <span>{rankLabel}</span> : null}
                              {rankLabel ? (
                                 <span className="text-border" aria-hidden>
                                    ·
                                 </span>
                              ) : null}
                              <span className="font-mono tabular-nums">{selectedTaxid}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  {hasChildren ? (
                     <div className="border-border/60 mt-1.5 ml-[1.125rem] border-l border-dashed border-l-muted-foreground/25 pl-2">
                        {childNodes.length > 10 ? (
                           <div className="mb-1 flex items-center gap-1.5">
                              <input
                                 type="text"
                                 value={childFilter}
                                 onChange={(e) => setChildFilter(e.target.value)}
                                 placeholder={t('taxonomy.detail.filterChildren')}
                                 className="bg-muted/20 border-border/60 text-foreground placeholder:text-muted-foreground h-6 min-w-0 flex-1 rounded border px-1.5 text-[0.7rem] outline-none focus:ring-1 focus:ring-primary/40"
                                 aria-label={t('taxonomy.detail.filterChildren')}
                              />
                              <span className="text-muted-foreground shrink-0 font-mono text-[0.65rem] tabular-nums">
                                 {childFilter
                                    ? `${childNodes.filter((c) => (c.name || c.taxid).toLowerCase().includes(childFilter.toLowerCase())).length} / ${childNodes.length}`
                                    : childNodes.length}
                              </span>
                           </div>
                        ) : null}
                        <ul
                           className="max-h-[min(22vh,200px)] space-y-0 overflow-y-auto [scrollbar-width:thin]"
                           aria-label={t('taxonomy.detail.navigateChildren')}
                        >
                           {childNodes
                              .filter((c) =>
                                 childFilter
                                    ? (c.name || c.taxid).toLowerCase().includes(childFilter.toLowerCase())
                                    : true,
                              )
                              .map((child, idx, arr) => {
                                 const cflat = byTaxid.get(child.taxid)
                                 const count = cflat?.organisms_count ?? child.leaves
                                 const isLast = idx === arr.length - 1
                                 return (
                                    <li key={child.taxid} className="relative">
                                       <span
                                          className="bg-border/80 absolute top-[0.65rem] -left-2 h-px w-2"
                                          aria-hidden
                                       />
                                       <button
                                          type="button"
                                          className={cn(
                                             'hover:bg-muted/60 flex w-full min-w-0 items-center justify-between gap-1.5 rounded px-1 py-1 text-left text-[0.7rem] leading-tight transition-colors',
                                             isLast ? 'pb-0' : '',
                                          )}
                                          onClick={() => onSelectTaxon(child.taxid)}
                                       >
                                          <span className="truncate">
                                             {(child.name || child.taxid).replace(/_/g, ' ')}
                                          </span>
                                          <span className="text-muted-foreground shrink-0 tabular-nums opacity-80">
                                             {count.toLocaleString()}
                                          </span>
                                       </button>
                                    </li>
                                 )
                              })}
                        </ul>
                     </div>
                  ) : null}
               </div>
            </nav>

            {showExploreLineage ? (
               <div className="space-y-1">
                  <Button
                     variant="secondary"
                     size="sm"
                     type="button"
                     asChild
                     className="h-9 w-full font-medium"
                  >
                     <Link href={catalogTaxonHref(selectedTaxid)} title={t('taxonomy.detail.viewRelatedDataTitle')}>
                        <CatalogIcon className="mr-1.5 h-4 w-4" aria-hidden />
                        {t('taxonomy.detail.viewRelatedData')}
                     </Link>
                  </Button>
                  <Button
                     variant="default"
                     size="sm"
                     type="button"
                     className="ring-primary/20 h-9 w-full font-semibold shadow-sm ring-1"
                     onClick={() => onExploreLineage(selectedTaxid)}
                     title={t('taxonomy.detail.exploreLineageTitle')}
                  >
                     {t('taxonomy.detail.exploreLineage')}
                  </Button>
                  <p className="text-muted-foreground px-0.5 text-center text-[0.65rem] leading-snug">
                     {t('taxonomy.detail.exploreLineageHint')}
                  </p>
               </div>
            ) : null}
         </div>

         <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {isSpeciesLeaf ? (
               <>
                  <div className="border-border shrink-0 border-b px-3 py-2">
                     <h3 className="text-xs font-semibold">{t('taxonomy.detail.speciesLeafHeading')}</h3>
                     <p className="text-muted-foreground mt-1 line-clamp-3 text-[0.7rem] leading-snug">
                        {t('taxonomy.detail.speciesLeafBody')}
                     </p>
                  </div>
                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
                     {organismItems[0] && organismTotal >= 1 ? (
                        <SpeciesCard
                           organism={organismItems[0]}
                           compact
                           hideCompactLineage
                           showGoatChips={goatActive}
                        />
                     ) : organismLoading && organismItems.length === 0 ? (
                        <div className="text-muted-foreground flex items-center gap-2 py-2 text-xs">
                           <Loader2 className="h-3.5 w-3.5 animate-spin" />
                           {t('taxonomy.detail.loadingOrganisms')}
                        </div>
                     ) : null}
                     <Button
                        asChild
                        className="ring-primary/20 h-9 w-full font-semibold shadow-sm ring-1"
                     >
                        <Link href={selectedDetailsHref}>
                           {t('taxonomy.detail.seeSpeciesDetails')}
                           <ChevronRight className="ml-1 size-3.5" aria-hidden />
                        </Link>
                     </Button>
                     {organismError ? (
                        <p className="text-destructive text-xs">{organismError}</p>
                     ) : !organismLoading && !(organismItems[0] && organismTotal >= 1) ? (
                        <div className="text-muted-foreground py-3 text-center text-xs">
                           <TreePine className="mx-auto mb-1.5 h-6 w-6 opacity-45" />
                           <p>{t('taxonomy.detail.noOrganismsInTaxon')}</p>
                        </div>
                     ) : null}
                  </div>
               </>
            ) : (
               <>
                  <div className="border-border shrink-0 border-b px-3 py-2">
                     <div className="flex min-w-0 items-start justify-between gap-2">
                        <h3 className="text-muted-foreground line-clamp-2 min-w-0 text-xs leading-snug font-medium">
                           <span className="text-foreground">{t('taxonomy.detail.speciesIn')}</span>{' '}
                           <span className="text-foreground/90">
                              {(selectedRow.scientific_name || selectedTaxid).replace(/_/g, ' ')}
                           </span>
                        </h3>
                        <Badge variant="secondary" className="shrink-0 text-[0.65rem]">
                           {organismTotal.toLocaleString()}
                        </Badge>
                     </div>
                  </div>

                  <div ref={listScrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3 py-2">
                     {organismError ? (
                        <p className="text-destructive text-xs leading-snug">{organismError}</p>
                     ) : organismLoading && organismItems.length === 0 ? (
                        <div className="text-muted-foreground flex items-center gap-2 py-6 text-xs">
                           <Loader2 className="h-3.5 w-3.5 animate-spin" />
                           {t('taxonomy.detail.loadingOrganisms')}
                        </div>
                     ) : organismItems.length > 0 ? (
                        <>
                           <div className="space-y-1.5">
                              {organismItems.map((row, idx) => (
                                 <SpeciesCard
                                    key={String(row.taxid ?? row._id ?? idx)}
                                    organism={row}
                                    compact
                                    hideCompactLineage
                                    showGoatChips={goatActive}
                                 />
                              ))}
                           </div>
                           {organismItems.length < organismTotal ? (
                              <div
                                 ref={loadMoreSentinelRef}
                                 className="flex min-h-8 w-full flex-col items-center justify-center py-1"
                                 aria-hidden
                              >
                                 {organismLoadingMore ? (
                                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                                 ) : (
                                    <span className="text-muted-foreground/60 text-[9px]">
                                       {t('common.scrollForMore')}
                                    </span>
                                 )}
                              </div>
                           ) : null}
                        </>
                     ) : (
                        <div className="text-muted-foreground py-6 text-center text-xs">
                           <TreePine className="mx-auto mb-1.5 h-7 w-7 opacity-45" />
                           <p>{t('taxonomy.detail.noOrganismsInTaxon')}</p>
                        </div>
                     )}
                  </div>
               </>
            )}
         </div>
      </div>
   )
}
