'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SpeciesCard } from '@/components/species-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLocale } from '@/contexts/locale-context'
import { downloadOrganismsTsv, fetchOrganisms } from '@/lib/api/organisms'
import { findSubtree } from '@/lib/taxonomy/treeFilter'
import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'
import type { FlatTreeNode, TreeTableRow } from '@/lib/taxonomy/treeTableTypes'
import { catalogTaxonHref } from '@/lib/taxonomyLinks'
import { cn } from '@/lib/utils'
import { ArrowLeft, ChevronRight, Download, Hash, Layers, Loader2, TreePine } from 'lucide-react'

const PAGE_SIZE = 21

const SPECIES_EXPORT_FIELDS = ['scientific_name', 'taxid', 'insdc_common_name'] as const

function pathFromRowMap(rowByTaxid: Map<string, TreeTableRow>, taxid: string): TreeTableRow[] {
   const path: TreeTableRow[] = []
   let cur: string | null = taxid
   const seen = new Set<string>()
   while (cur && !seen.has(cur)) {
      seen.add(cur)
      const row = rowByTaxid.get(cur)
      if (!row) break
      path.unshift(row)
      cur = row.parent_taxid
   }
   return path
}

function rankBadgeClass(rank: string, rankColors: Record<string, string>): string {
   const key = Object.keys(rankColors).find((k) => k.toLowerCase() === rank.trim().toLowerCase())
   return (key && rankColors[key]) || 'bg-secondary'
}

function formatRankLabel(rank: string): string {
   const r = rank.trim().toLowerCase().replace(/_/g, ' ')
   if (!r) return ''
   return r
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
}

const rankColors: Record<string, string> = {
   Domain: 'bg-chart-1/20 text-chart-1',
   Kingdom: 'bg-chart-2/20 text-chart-2',
   Phylum: 'bg-chart-3/20 text-chart-3',
   Class: 'bg-chart-4/20 text-chart-4',
   Order: 'bg-chart-5/20 text-chart-5',
   Family: 'bg-primary/20 text-primary',
}

export type TaxonomyDetailAsideProps = {
   selectedTaxid: string | null
   onSelectTaxon: (taxid: string | null) => void
   onSetTreeRoot: (taxid: string) => void
   nestedTree: NestedTaxonNode | null
   byTaxid: Map<string, FlatTreeNode>
   rowByTaxid: Map<string, TreeTableRow>
}

export function TaxonomyDetailAside({
   selectedTaxid,
   onSelectTaxon,
   onSetTreeRoot,
   nestedTree,
   byTaxid,
   rowByTaxid,
}: TaxonomyDetailAsideProps) {
   const { t } = useLocale()
   const [organismItems, setOrganismItems] = useState<Record<string, unknown>[]>([])
   const [organismTotal, setOrganismTotal] = useState(0)
   const [organismLoading, setOrganismLoading] = useState(false)
   const [organismLoadingMore, setOrganismLoadingMore] = useState(false)
   const [organismError, setOrganismError] = useState<string | null>(null)
   const [downloadLoading, setDownloadLoading] = useState(false)

   const loadMoreInFlightRef = useRef(false)
   const listScrollRef = useRef<HTMLDivElement>(null)
   const loadMoreSentinelRef = useRef<HTMLDivElement>(null)

   const selectedRow = selectedTaxid ? byTaxid.get(selectedTaxid) : null
   const selectedNested = useMemo((): NestedTaxonNode | null => {
      if (!selectedTaxid || !nestedTree) return null
      return findSubtree(nestedTree, selectedTaxid)
   }, [nestedTree, selectedTaxid])

   const breadcrumbRows = useMemo(() => {
      if (!selectedTaxid) return []
      return pathFromRowMap(rowByTaxid, selectedTaxid)
   }, [rowByTaxid, selectedTaxid])

   const loadOrganisms = useCallback(
      async (offset: number, append: boolean) => {
         if (!selectedTaxid) return
         if (append) setOrganismLoadingMore(true)
         else setOrganismLoading(true)
         setOrganismError(null)
         try {
            const { data, total: t } = await fetchOrganisms({
               taxon_lineage: selectedTaxid,
               limit: PAGE_SIZE,
               offset,
            })
            if (append) {
               setOrganismItems((prev) => [...prev, ...data])
               setOrganismTotal(t)
            } else {
               setOrganismItems(data)
               setOrganismTotal(t)
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
      [selectedTaxid],
   )

   useEffect(() => {
      if (!selectedTaxid) {
         setOrganismItems([])
         setOrganismTotal(0)
         setOrganismError(null)
         return
      }
      void loadOrganisms(0, false)
   }, [selectedTaxid, loadOrganisms])

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
      if (!selectedTaxid) return {}
      return { taxon_lineage: selectedTaxid }
   }, [selectedTaxid])

   const onDownloadSpeciesTsv = useCallback(async () => {
      if (!selectedTaxid) return
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
   }, [buildOrganismExportQuery, selectedTaxid, selectedRow?.scientific_name])

   return (
      <aside className="bg-card flex min-h-0 flex-col overflow-hidden border-t border-border lg:col-start-2 lg:row-start-1 lg:h-full lg:max-h-full lg:min-h-0 lg:border-l lg:border-t-0">
         {selectedTaxid && selectedRow ? (
            <>
               <div className="border-border shrink-0 border-b p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                     <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSelectTaxon(null)}
                        className="text-muted-foreground"
                     >
                        <ArrowLeft className="mr-1 h-4 w-4" />
                        {t('taxonomy.detail.clearSelection')}
                     </Button>
                     <Button variant="outline" size="sm" asChild>
                        <Link href={catalogTaxonHref(selectedTaxid)}>
                           {t('taxonomy.detail.openInCatalog')}
                        </Link>
                     </Button>
                     <Button
                        variant="secondary"
                        size="sm"
                        type="button"
                        onClick={() => onSetTreeRoot(selectedTaxid)}
                        title={t('taxonomy.detail.setAsTreeRootTitle')}
                     >
                        {t('taxonomy.detail.setAsTreeRoot')}
                     </Button>
                  </div>

                  <div className="text-muted-foreground mb-4 flex flex-wrap items-center gap-1 text-xs">
                     {breadcrumbRows.map((row, index) => (
                        <span key={row.taxid} className="flex items-center">
                           {index > 0 && <ChevronRight className="mx-1 h-3 w-3" />}
                           <button
                              type="button"
                              onClick={() => onSelectTaxon(row.taxid)}
                              className={cn(
                                 'hover:text-primary transition-colors',
                                 row.taxid === selectedTaxid && 'text-primary font-medium',
                              )}
                           >
                              {row.name || row.taxid}
                           </button>
                        </span>
                     ))}
                  </div>

                  <div className="flex items-start justify-between gap-3">
                     <div>
                        <h2 className="text-2xl font-bold">
                           {(selectedRow.scientific_name || selectedTaxid).replace(/_/g, ' ')}
                        </h2>
                        <Badge className={cn('mt-2', rankBadgeClass(selectedRow.rank, rankColors))}>
                           {formatRankLabel(selectedRow.rank)}
                        </Badge>
                     </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                     <Card>
                        <CardContent className="flex items-center gap-3 p-3">
                           <div className="bg-primary/10 rounded-md p-2">
                              <Hash className="text-primary h-4 w-4" />
                           </div>
                           <div>
                              <div className="text-lg font-semibold">
                                 {(selectedRow.organisms_count ?? 0).toLocaleString()}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                 {t('taxonomy.detail.organisms')}
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                     <Card>
                        <CardContent className="flex items-center gap-3 p-3">
                           <div className="bg-chart-2/10 rounded-md p-2">
                              <Layers className="text-chart-2 h-4 w-4" />
                           </div>
                           <div>
                              <div className="text-lg font-semibold">
                                 {selectedNested?.children?.length ?? 0}
                              </div>
                              <div className="text-muted-foreground text-xs">
                                 {t('taxonomy.detail.subTaxa')}
                              </div>
                           </div>
                        </CardContent>
                     </Card>
                  </div>

                  {selectedNested?.children && selectedNested.children.length > 0 ? (
                     <div className="mt-4">
                        <div className="mb-2 text-sm font-medium">{t('taxonomy.detail.subTaxa')}</div>
                        <div className="flex flex-wrap gap-1.5">
                           {selectedNested.children.map((child) => {
                              const cflat = byTaxid.get(child.taxid)
                              const count = cflat?.organisms_count ?? child.leaves
                              return (
                                 <Badge
                                    key={child.taxid}
                                    variant="outline"
                                    className="hover:bg-secondary cursor-pointer transition-colors"
                                    onClick={() => onSelectTaxon(child.taxid)}
                                 >
                                    {child.name || child.taxid}
                                    <span className="text-muted-foreground ml-1">
                                       ({count.toLocaleString()})
                                    </span>
                                 </Badge>
                              )
                           })}
                        </div>
                     </div>
                  ) : null}
               </div>

               <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="border-border shrink-0 border-b px-4 pt-4 pb-3">
                     <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-medium">
                           {t('taxonomy.detail.organismsIn')}{' '}
                           {(selectedRow.scientific_name || selectedTaxid).replace(/_/g, ' ')}
                        </h3>
                        <Badge variant="secondary">{organismTotal.toLocaleString()}</Badge>
                     </div>
                  </div>

                  <div
                     ref={listScrollRef}
                     className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
                  >
                     {organismError ? (
                        <p className="text-destructive text-sm">{organismError}</p>
                     ) : organismLoading && organismItems.length === 0 ? (
                        <div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
                           <Loader2 className="h-4 w-4 animate-spin" />
                           {t('taxonomy.detail.loadingOrganisms')}
                        </div>
                     ) : organismItems.length > 0 ? (
                        <>
                           <div className="space-y-2">
                              {organismItems.map((row, idx) => (
                                 <SpeciesCard
                                    key={String(row.taxid ?? row._id ?? idx)}
                                    organism={row}
                                    compact
                                 />
                              ))}
                           </div>
                           {organismItems.length < organismTotal ? (
                              <div
                                 ref={loadMoreSentinelRef}
                                 className="flex min-h-10 w-full flex-col items-center justify-center py-2"
                                 aria-hidden
                              >
                                 {organismLoadingMore ? (
                                    <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
                                 ) : (
                                    <span className="text-muted-foreground/70 text-[10px]">
                                       {t('common.scrollForMore')}
                                    </span>
                                 )}
                              </div>
                           ) : null}
                        </>
                     ) : (
                        <div className="text-muted-foreground py-8 text-center text-sm">
                           <TreePine className="mx-auto mb-2 h-8 w-8 opacity-50" />
                           <p>{t('taxonomy.detail.noOrganismsInTaxon')}</p>
                        </div>
                     )}
                  </div>

                  <div className="border-border bg-card shrink-0 space-y-1 border-t px-4 py-3">
                     <Button
                        variant="outline"
                        size="sm"
                        className="h-9 w-full gap-2"
                        disabled={
                           !selectedTaxid ||
                           organismLoading ||
                           organismTotal === 0 ||
                           downloadLoading
                        }
                        onClick={() => void onDownloadSpeciesTsv()}
                     >
                        {downloadLoading ? (
                           <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                           <Download className="h-4 w-4" />
                        )}
                        {t('taxonomy.detail.exportSpeciesListTsv')}
                     </Button>
                     {organismItems.length > 0 && organismTotal > 0 ? (
                        <p className="text-muted-foreground text-center text-[10px]">
                           {t('common.showing')} {organismItems.length.toLocaleString()} {t('common.of')}{' '}
                           {organismTotal.toLocaleString()}
                           {organismItems.length < organismTotal
                              ? ` · ${t('common.scrollToLoadMore')}`
                              : null}
                        </p>
                     ) : null}
                  </div>
               </div>
            </>
         ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center p-8 text-center">
               <div className="bg-primary/10 mb-4 rounded-full p-4">
                  <TreePine className="text-primary h-8 w-8" />
               </div>
               <h3 className="mb-2 text-lg font-semibold">{t('taxonomy.detail.selectTaxon')}</h3>
               <p className="text-muted-foreground max-w-xs text-sm">
                  {t('taxonomy.detail.selectTaxonHint')}
               </p>
            </div>
         )}
      </aside>
   )
}
