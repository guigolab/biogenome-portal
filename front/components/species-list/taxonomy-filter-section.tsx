'use client'

import { CompactTaxonomicTree } from '@/components/compact-taxonomy-tree'
import { Button } from '@/components/ui/button'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import type { TaxonRecord } from '@/lib/api/taxon'
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
   selectedTaxonTaxid: string | null
   treeSelectedTaxons: TaxonRecord[]
   onTaxonToggle: (taxon: TaxonRecord) => void
   onClearLineage: () => void
   onLoadMoreRank: () => void
}

export function TaxonomyFilterSection({
   visibleRankGroups,
   rankStats,
   explorerRankId,
   onExplorerRankIdChange,
   taxonCache,
   selectedTaxonTaxid,
   treeSelectedTaxons,
   onTaxonToggle,
   onClearLineage,
   onLoadMoreRank,
}: TaxonomyFilterSectionProps) {
   const { t } = useLocale()

   const rankRoots = taxonOptionsToRecords(taxonCache.items)
   const hasMore = taxonCache.items.length < taxonCache.total
   const lineageActive = Boolean(selectedTaxonTaxid)
   const treeMode = explorerRankId === TAXONOMY_EXPLORER_TREE_MODE_ID

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

         <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-md border border-border [max-height:min(38vh,12rem)] [min-height:8rem]">
            {treeMode ? treePanel : visibleRankGroups.length > 0 ? rankListPanel : treePanel}
         </div>
      </section>
   )
}
