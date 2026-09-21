'use client'

import { useEffect, useState } from 'react'

import { CitizenTaxonTree } from '@/components/citizen-taxon-tree'
import { CompactTaxonomicTree } from '@/components/compact-taxonomy-tree'
import { TaxonomyBrowseModeToggle } from '@/components/taxonomy-browse-mode-toggle'
import { Button } from '@/components/ui/button'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import type { TaxonRecord } from '@/lib/api/taxon'
import {
   readStoredTaxonomyBrowseMode,
   writeStoredTaxonomyBrowseMode,
   type TaxonomyBrowseMode,
} from '@/lib/citizenTaxonomy'
import type { CitizenTaxonomyConfig, CitizenTaxonomyNode } from '@/lib/portal/types'
import type { RankGroupDef } from '@/lib/taxonRankFilter'
import { rankGroupDisplayCount, TAXONOMY_EXPLORER_TREE_MODE_ID } from '@/lib/taxonRankFilter'
import { useLocale } from '@/contexts/locale-context'
import type { RankTaxonCache } from './types'

function taxonOptionsToRecords(items: RankTaxonCache['items']): TaxonRecord[] {
   return items.map((t) => ({
      taxid: t.taxid,
      scientific_name: t.name,
      name: t.name,
      rank: t.rank,
      organisms_count: t.organismsCount ?? 0,
      assemblies_count: 0,
      annotations_count: 0,
   }))
}

export type TaxonomyFilterSectionProps = {
   visibleRankGroups: RankGroupDef[]
   rankStats: Record<string, number> | null
   explorerRankId: string
   onExplorerRankIdChange: (rankId: string) => void
   taxonCache: RankTaxonCache
   /** True when any taxonomy scope (full tree or citizen) is active. */
   lineageActive: boolean
   treeSelectedTaxons: TaxonRecord[]
   onTaxonToggle: (taxon: TaxonRecord) => void
   onClearLineage: () => void
   onLoadMoreRank: () => void
   citizenTaxonomy: CitizenTaxonomyConfig | null
   selectedCitizenNodeId: string | null
   onCitizenNodeSelect: (node: CitizenTaxonomyNode) => void
   onBrowseModeChange?: (mode: TaxonomyBrowseMode) => void
}

export function TaxonomyFilterSection({
   visibleRankGroups,
   rankStats,
   explorerRankId,
   onExplorerRankIdChange,
   taxonCache,
   lineageActive,
   treeSelectedTaxons,
   onTaxonToggle,
   onClearLineage,
   onLoadMoreRank,
   citizenTaxonomy,
   selectedCitizenNodeId,
   onCitizenNodeSelect,
   onBrowseModeChange,
}: TaxonomyFilterSectionProps) {
   const { t } = useLocale()
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

   const handleBrowseModeChange = (mode: TaxonomyBrowseMode) => {
      setBrowseMode(mode)
      writeStoredTaxonomyBrowseMode(mode)
      onBrowseModeChange?.(mode)
   }

   const rankRoots = taxonOptionsToRecords(taxonCache.items)
   const hasMore = !taxonCache.exhausted && taxonCache.items.length < taxonCache.total
   const treeMode = explorerRankId === TAXONOMY_EXPLORER_TREE_MODE_ID
   const showCitizen = hasCitizen && browseMode === 'citizen'

   const treePanel = (
      <CompactTaxonomicTree
         variant="root"
         selectedTaxons={treeSelectedTaxons}
         onTaxonToggle={onTaxonToggle}
         selectionMode="single"
         fillContainer
      />
   )

   const rankListPanel = (
      <CompactTaxonomicTree
         variant="rankList"
         rankRoots={rankRoots}
         selectedTaxons={treeSelectedTaxons}
         onTaxonToggle={onTaxonToggle}
         selectionMode="single"
         loadingRankRoots={taxonCache.loading && taxonCache.items.length === 0}
         loadingMoreRankRoots={taxonCache.loadingMore}
         hasMoreRankRoots={hasMore}
         onLoadMore={onLoadMoreRank}
         fillContainer
      />
   )

   return (
      <section
         className="flex min-h-0 min-w-0 flex-col gap-2"
         aria-label={t('speciesList.taxonomySectionTitle')}
      >
         {hasCitizen ? (
            <TaxonomyBrowseModeToggle mode={browseMode} onModeChange={handleBrowseModeChange} />
         ) : null}

         {!showCitizen ? (
            <div className="flex min-w-0 shrink-0 items-center gap-2">
               <Select value={explorerRankId} onValueChange={onExplorerRankIdChange}>
                  <SelectTrigger
                     className="h-9 min-w-0 flex-1 text-left text-xs"
                     aria-label={t('speciesList.taxonomyRankSelectAria')}
                  >
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value={TAXONOMY_EXPLORER_TREE_MODE_ID} className="text-xs">
                        <span className="font-medium">{t('speciesList.taxonomyBrowseByRankTab')}</span>
                     </SelectItem>
                     {visibleRankGroups.map((g) => {
                        const count = rankGroupDisplayCount(g.id, rankStats ?? {})
                        return (
                           <SelectItem key={g.id} value={g.id} className="text-xs">
                              <span className="flex w-full items-center justify-between gap-3">
                                 <span>{g.label}</span>
                                 <span className="tabular-nums text-muted-foreground">
                                    {count.toLocaleString()}
                                 </span>
                              </span>
                           </SelectItem>
                        )
                     })}
                  </SelectContent>
               </Select>
               {lineageActive ? (
                  <Button
                     type="button"
                     variant="outline"
                     size="sm"
                     className="h-9 shrink-0 px-2 text-xs"
                     onClick={(e) => {
                        e.preventDefault()
                        onClearLineage()
                     }}
                  >
                     {t('speciesList.clearTaxonomyFilter')}
                  </Button>
               ) : null}
            </div>
         ) : lineageActive ? (
            <div className="flex justify-end">
               <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 px-2 text-xs"
                  onClick={(e) => {
                     e.preventDefault()
                     onClearLineage()
                  }}
               >
                  {t('speciesList.clearTaxonomyFilter')}
               </Button>
            </div>
         ) : null}

         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border [max-height:min(38vh,12rem)] [min-height:8rem]">
            {showCitizen && citizenTaxonomy ? (
               <CitizenTaxonTree
                  nodes={citizenTaxonomy.nodes}
                  selectedId={selectedCitizenNodeId}
                  onSelect={onCitizenNodeSelect}
               />
            ) : treeMode ? (
               treePanel
            ) : visibleRankGroups.length > 0 ? (
               rankListPanel
            ) : (
               treePanel
            )}
         </div>
      </section>
   )
}
