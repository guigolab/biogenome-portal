'use client'

import { useEffect } from 'react'

import { useTaxonomyTreeStore } from '@/lib/stores/taxonomy-tree-store'

import { TaxonomyDetailAside } from './taxonomy-detail-aside'
import { TaxonomyTreePanel } from './taxonomy-tree-panel'
import { useTaxonomyPageQuery } from './use-taxonomy-page-query'

export default function TaxonomyClientPage() {
   const { effectiveTreeRoot, selectedTaxid, selectTaxon, setTreeRoot, resetTreeRoot } =
      useTaxonomyPageQuery()

   const loadTree = useTaxonomyTreeStore((s) => s.loadTree)
   const nestedTree = useTaxonomyTreeStore((s) => s.nestedTree)
   const byTaxid = useTaxonomyTreeStore((s) => s.byTaxid)
   const rowByTaxid = useTaxonomyTreeStore((s) => s.rowByTaxid)

   useEffect(() => {
      void loadTree(effectiveTreeRoot)
   }, [effectiveTreeRoot, loadTree])

   return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
         <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(240px,min(42vh,520px))_minmax(0,1fr)] overflow-hidden lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-[minmax(0,1fr)] lg:items-stretch">
            <TaxonomyTreePanel
               selectedTaxid={selectedTaxid}
               onSelectTaxon={selectTaxon}
               onSetTreeRoot={(taxid) => setTreeRoot(taxid)}
               onResetTreeRoot={resetTreeRoot}
            />
            <TaxonomyDetailAside
               selectedTaxid={selectedTaxid}
               onSelectTaxon={selectTaxon}
               onSetTreeRoot={(taxid) => setTreeRoot(taxid)}
               nestedTree={nestedTree}
               byTaxid={byTaxid}
               rowByTaxid={rowByTaxid}
            />
         </div>
      </div>
   )
}
