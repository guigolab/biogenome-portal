'use client'

import { useEffect } from 'react'

import { useLocale } from '@/contexts/locale-context'
import { useTaxonomyTreeStore } from '@/lib/stores/taxonomy-tree-store'
import { cn } from '@/lib/utils'
import { useRootTaxonStore } from '@/stores/root-taxon-store'

import { TaxonomyDetailAside } from './taxonomy-detail-aside'
import { TaxonomyTreePanel } from './taxonomy-tree-panel'
import { useTaxonomyPageQuery } from './use-taxonomy-page-query'

export default function TaxonomyClientPage() {
   const { t } = useLocale()
   const { effectiveTreeRoot, selectedTaxid, selectTaxon, setTreeRoot, resetTreeRoot } =
      useTaxonomyPageQuery()

   const loadRootTaxon = useRootTaxonStore((s) => s.loadRootTaxon)
   const loadTree = useTaxonomyTreeStore((s) => s.loadTree)
   const nestedTree = useTaxonomyTreeStore((s) => s.nestedTree)
   const byTaxid = useTaxonomyTreeStore((s) => s.byTaxid)
   const rowByTaxid = useTaxonomyTreeStore((s) => s.rowByTaxid)
   const treeLoadStatus = useTaxonomyTreeStore((s) => s.status)

   useEffect(() => {
      void loadRootTaxon()
   }, [loadRootTaxon])

   useEffect(() => {
      void loadTree(effectiveTreeRoot)
   }, [effectiveTreeRoot, loadTree])

   return (
      <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
         <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <TaxonomyTreePanel
               selectedTaxid={selectedTaxid}
               onSelectTaxon={selectTaxon}
               onSetTreeRoot={(taxid) => setTreeRoot(taxid)}
               onResetTreeRoot={resetTreeRoot}
            />
         </div>

         {/*
            Non-modal floating drawer (no overlay). Do not put pointer-events-none on the outer shell
            while open: WebKit/Chromium often fail to hit-test pointer-events-auto descendants through a
            transformed pointer-events-none parent, so clicks pass through to the tree and the panel
            looks “dead”. When closed, translate off-screen and disable pointer events so nothing steals
            edge taps.
         */}
         <div
            className={cn(
               'absolute inset-y-0 right-0 z-[1120] flex w-[min(420px,100vw)] max-w-[min(420px,100vw)] transition-transform duration-300 ease-out',
               selectedTaxid ? 'translate-x-0' : 'pointer-events-none translate-x-full',
            )}
            aria-hidden={!selectedTaxid}
         >
            <div
               className="border-border bg-card flex h-full min-h-0 w-full flex-col border-l shadow-lg"
               role="complementary"
               aria-label={t('taxonomy.detail.detailDrawerAria')}
            >
               {selectedTaxid ? (
                  <TaxonomyDetailAside
                     selectedTaxid={selectedTaxid}
                     effectiveTreeRoot={effectiveTreeRoot}
                     treeLoadStatus={treeLoadStatus}
                     onSelectTaxon={selectTaxon}
                     onExploreLineage={(taxid) => setTreeRoot(taxid, { preserveTaxid: true })}
                     nestedTree={nestedTree}
                     byTaxid={byTaxid}
                     rowByTaxid={rowByTaxid}
                  />
               ) : null}
            </div>
         </div>
      </div>
   )
}
