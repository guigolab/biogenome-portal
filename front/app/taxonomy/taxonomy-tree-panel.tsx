'use client'

import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { D3RadialTree } from '@/components/d3-radial-tree'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/contexts/locale-context'
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from '@/components/ui/select'
import type { SubtreeLookupResponse } from '@/lib/api/tree'
import { getDisplayNestedRoot, useTaxonomyTreeStore } from '@/lib/stores/taxonomy-tree-store'
import { branchLegendFromHierarchy } from '@/lib/taxonomy/treeBranchLegend'
import { buildHierarchyFromNested } from '@/lib/taxonomy/treeHierarchy'
import type { NestedTaxonNode } from '@/lib/taxonomy/flattenedTreeToNested'
import { MAX_TREE_LEAVES } from '@/lib/taxonomy/taxonomyTreeLimits'
import { formatRankFilterLabel, TREE_RANK_FILTER_OPTIONS } from '@/lib/taxonomy/treeRankOptions'
import { ChevronRight, ChevronsDown, CornerLeftUp, Home, Loader2, TreePine } from 'lucide-react'

import { useTaxonomyLeafLabelColors } from './use-taxonomy-leaf-label-colors'
import { useTaxonomyRootLineage } from './use-taxonomy-root-lineage'

const RANK_FILTER_ALL = 'all'

function formatRankSelectLabel(rank: string, lookup?: SubtreeLookupResponse): string {
   const base = formatRankFilterLabel(rank)
   if (!lookup) return base
   return `${base} — ${lookup.total_leaves.toLocaleString()} leaves · ${lookup.total_nodes.toLocaleString()} nodes`
}

export type TaxonomyTreePanelProps = {
   selectedTaxid: string | null
   onSelectTaxon: (taxid: string | null) => void
   /** Re-root the tree (sets URL `root`). */
   onSetTreeRoot: (taxid: string) => void
   /** Clear custom root (portal ``ROOT_NODE``). */
   onResetTreeRoot: () => void
}

export function TaxonomyTreePanel({
   selectedTaxid,
   onSelectTaxon,
   onSetTreeRoot,
   onResetTreeRoot,
}: TaxonomyTreePanelProps) {
   const { t } = useLocale()
   const { resolvedTheme } = useTheme()
   const isDark = resolvedTheme === 'dark'
   const leafColors = useTaxonomyLeafLabelColors()

   const status = useTaxonomyTreeStore((s) => s.status)
   const error = useTaxonomyTreeStore((s) => s.error)
   const nestedTree = useTaxonomyTreeStore((s) => s.nestedTree)
   const byTaxid = useTaxonomyTreeStore((s) => s.byTaxid)
   const rowByTaxid = useTaxonomyTreeStore((s) => s.rowByTaxid)
   const loadMode = useTaxonomyTreeStore((s) => s.loadMode)
   const apiRankLevel = useTaxonomyTreeStore((s) => s.apiRankLevel)
   const lookupByRank = useTaxonomyTreeStore((s) => s.lookupByRank)
   const treeRootTaxid = useTaxonomyTreeStore((s) => s.treeRootTaxid)
   const rootScientificName = useTaxonomyTreeStore((s) => s.rootScientificName)
   const portalRootTaxid = useTaxonomyTreeStore((s) => s.portalRootTaxid)
   const subtreeWarning = useTaxonomyTreeStore((s) => s.subtreeWarning)
   const loadTree = useTaxonomyTreeStore((s) => s.loadTree)

   const { lineage, loadingLineage } = useTaxonomyRootLineage(treeRootTaxid, portalRootTaxid)

   const [clientRankFilter, setClientRankFilter] = useState<string>(RANK_FILTER_ALL)
   const [showLabels, setShowLabels] = useState(false)

   useEffect(() => {
      if (loadMode === 'full') {
         setClientRankFilter(RANK_FILTER_ALL)
      }
   }, [loadMode])

   const rankForDisplay = useMemo(() => {
      if (loadMode === 'subtree') return null
      return clientRankFilter === RANK_FILTER_ALL ? null : clientRankFilter
   }, [loadMode, clientRankFilter])

   const hierarchy = useMemo(() => {
      if (!nestedTree) return null
      const filtered = getDisplayNestedRoot(nestedTree, rankForDisplay, loadMode)
      if (!filtered) return null
      return buildHierarchyFromNested(filtered, byTaxid)
   }, [nestedTree, byTaxid, rankForDisplay, loadMode])

   const branchLegend = useMemo(() => {
      if (!hierarchy) return []
      return branchLegendFromHierarchy(hierarchy, Boolean(isDark))
   }, [hierarchy, isDark])

   const layoutTransitionKey = useMemo(() => {
      const root = treeRootTaxid ?? ''
      if (loadMode === 'subtree') {
         return `${root}|sub|${apiRankLevel ?? ''}`
      }
      return `${root}|full|${clientRankFilter}`
   }, [treeRootTaxid, loadMode, apiRankLevel, clientRankFilter])

   const directChildren = useMemo((): NestedTaxonNode[] => {
      if (!nestedTree?.children?.length) return []
      return nestedTree.children
   }, [nestedTree])

   const parentTaxid = useMemo(() => {
      if (lineage.length >= 2) {
         return lineage[lineage.length - 2]!.taxid
      }
      if (!treeRootTaxid) return null
      return rowByTaxid.get(treeRootTaxid)?.parent_taxid ?? null
   }, [lineage, rowByTaxid, treeRootTaxid])

   const navigateToRootTaxon = useCallback(
      (taxid: string) => {
         const t = taxid.trim()
         if (!t) return
         if (portalRootTaxid && t === portalRootTaxid) {
            onResetTreeRoot()
         } else {
            onSetTreeRoot(t)
         }
      },
      [onResetTreeRoot, onSetTreeRoot, portalRootTaxid],
   )

   const handleFullRankChange = useCallback(
      (value: string) => {
         setClientRankFilter(value)
         onSelectTaxon(null)
      },
      [onSelectTaxon],
   )

   const handleSubtreeRankChange = useCallback(
      (value: string) => {
         if (!treeRootTaxid) return
         onSelectTaxon(null)
         void loadTree(treeRootTaxid, { requestedRank: value })
      },
      [loadTree, onSelectTaxon, treeRootTaxid],
   )

   const rankSelectValue =
      loadMode === 'subtree' ? (apiRankLevel ?? TREE_RANK_FILTER_OPTIONS[0]) : clientRankFilter

   const isSubtreeRankDisabled = useCallback(
      (rank: string) => {
         const L = lookupByRank[rank]?.total_leaves
         return L == null || L > MAX_TREE_LEAVES
      },
      [lookupByRank],
   )

   const showResetRoot =
      Boolean(treeRootTaxid && portalRootTaxid && treeRootTaxid !== portalRootTaxid)

   const atPortalRoot = Boolean(
      treeRootTaxid && portalRootTaxid && treeRootTaxid === portalRootTaxid,
   )

   const canGoToParent = Boolean(
      parentTaxid &&
         treeRootTaxid &&
         portalRootTaxid &&
         treeRootTaxid !== portalRootTaxid,
   )

   const loadingTree = status === 'loading' || status === 'idle'
   const treeError = status === 'error' ? error : null

   const rootTitle =
      rootScientificName?.replace(/_/g, ' ') || treeRootTaxid || '…'

   return (
      <div className="border-border relative flex min-h-0 flex-col border-b bg-card/50 lg:col-start-1 lg:row-start-1 lg:h-full lg:max-h-full lg:border-b-0 lg:border-r">
         <div className="relative w-full min-h-[240px] flex-1 lg:min-h-0">
            <D3RadialTree
               hierarchy={hierarchy}
               loading={loadingTree}
               error={treeError}
               highlightTaxid={selectedTaxid}
               showCanvasDomainLegend={false}
               controlledShowLabels={showLabels}
               layoutTransitionKey={layoutTransitionKey}
               onNodeClick={({ taxid }) => onSelectTaxon(taxid)}
               leafLabelFill={leafColors.defaultFill}
               leafLabelFillHover={leafColors.hoverFill}
            />

            <div className="pointer-events-none absolute inset-0 z-[1000]">
               <div className="pointer-events-auto absolute top-4 left-4 max-h-[min(72vh,560px)] max-w-[min(100%,22rem)] overflow-y-auto">
                  <div className="bg-card/95 border-border rounded-lg border p-3 shadow-sm backdrop-blur">
                     <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                        <TreePine className="text-primary h-4 w-4 shrink-0" />
                        {t('taxonomy.panel.title')}
                     </div>

                     <div className="border-border mb-3 rounded-md border bg-muted/30 px-2.5 py-2">
                        <div className="text-muted-foreground mb-1 text-[0.65rem] font-semibold tracking-wide uppercase">
                           {t('taxonomy.panel.currentTreeRoot')}
                        </div>
                        <div className="text-foreground text-sm font-medium leading-snug" title={treeRootTaxid ?? ''}>
                           {rootTitle}
                        </div>
                        <div className="text-muted-foreground mt-0.5 font-mono text-[0.65rem]">
                           {t('taxonomy.panel.taxid')} {treeRootTaxid ?? '-'}
                        </div>
                        {atPortalRoot ? (
                           <p className="text-muted-foreground mt-1.5 text-[0.65rem]">
                              {t('taxonomy.panel.portalDefaultRoot')} (
                              <span className="font-mono">ROOT_NODE</span>)
                           </p>
                        ) : null}
                     </div>

                     <div className="mb-3 space-y-2">
                        <div className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
                           {t('taxonomy.panel.lineage')}
                        </div>
                        {loadingLineage ? (
                           <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              {t('common.loading')}
                           </div>
                        ) : lineage.length > 0 ? (
                           <div className="flex flex-wrap items-center gap-0.5 text-xs">
                              {lineage.map((entry, index) => {
                                 const isLast = index === lineage.length - 1
                                 return (
                                    <span key={entry.taxid} className="flex min-w-0 items-center gap-0.5">
                                       {index > 0 && (
                                          <ChevronRight className="text-muted-foreground h-3 w-3 shrink-0" />
                                       )}
                                       {isLast ? (
                                          <span className="text-foreground max-w-[11rem] truncate font-medium">
                                             {entry.name.replace(/_/g, ' ')}
                                          </span>
                                       ) : (
                                          <button
                                             type="button"
                                             className="text-primary hover:underline max-w-[9rem] truncate text-left"
                                             title={`${t('taxonomy.panel.setTreeRootTo')} ${entry.name} (${entry.taxid})`}
                                             onClick={() => navigateToRootTaxon(entry.taxid)}
                                          >
                                             {entry.name.replace(/_/g, ' ')}
                                          </button>
                                       )}
                                    </span>
                                 )
                              })}
                           </div>
                        ) : (
                           <p className="text-muted-foreground text-xs">
                              {t('taxonomy.panel.noLineageData')}
                           </p>
                        )}
                        <Button
                           type="button"
                           variant="secondary"
                           size="sm"
                           className="h-7 w-full gap-1 text-xs"
                           disabled={!canGoToParent || !parentTaxid}
                           onClick={() => navigateToRootTaxon(parentTaxid!)}
                           title={t('taxonomy.panel.moveRootToParent')}
                        >
                           <CornerLeftUp className="h-3.5 w-3.5 shrink-0" />
                           {t('taxonomy.panel.upToParent')}
                        </Button>
                     </div>

                     {directChildren.length > 0 ? (
                        <div className="mb-3">
                           <div className="text-muted-foreground mb-1.5 flex items-center gap-1 text-[0.65rem] font-semibold tracking-wide uppercase">
                              <ChevronsDown className="h-3 w-3" />
                              {t('taxonomy.panel.childRoots')}
                           </div>
                           <p className="text-muted-foreground mb-1.5 text-[0.65rem] leading-snug">
                              {t('taxonomy.panel.setRootChildHint')}
                           </p>
                           <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto">
                              {directChildren.map((child) => {
                                 const flat = byTaxid.get(child.taxid)
                                 const count = flat?.organisms_count ?? child.leaves
                                 return (
                                    <Button
                                       key={child.taxid}
                                       type="button"
                                       variant="outline"
                                       size="sm"
                                       className="h-auto max-w-full py-1 text-left text-[0.65rem] leading-tight"
                                       title={`${t('taxonomy.panel.rootTreeAt')} ${child.name} (${child.taxid})`}
                                       onClick={() => onSetTreeRoot(child.taxid)}
                                    >
                                       <span className="truncate">{child.name.replace(/_/g, ' ')}</span>
                                       <span className="text-muted-foreground ml-1 shrink-0 font-mono">
                                          ({count.toLocaleString()})
                                       </span>
                                    </Button>
                                 )
                              })}
                           </div>
                        </div>
                     ) : null}

                     <p className="text-muted-foreground mb-3 text-xs">
                        {t('taxonomy.panel.selectTaxonHint')}
                     </p>
                     {subtreeWarning ? (
                        <p className="text-muted-foreground mb-2 text-xs">
                           {t('taxonomy.panel.subtreeWarningPrefix')} (
                           {MAX_TREE_LEAVES.toLocaleString()} {t('taxonomy.panel.leaves')}).
                        </p>
                     ) : null}
                     <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-start gap-2">
                           <span className="text-muted-foreground w-14 shrink-0 pt-1.5 text-xs font-medium">
                              {t('taxonomy.panel.rank')}
                           </span>
                           <div className="min-w-0 flex-1">
                              {loadMode === 'subtree' ? (
                                 <Select value={rankSelectValue} onValueChange={handleSubtreeRankChange}>
                                    <SelectTrigger
                                       size="sm"
                                       className="h-auto min-h-8 w-full max-w-[min(100%,240px)] py-1.5"
                                       aria-label={t('taxonomy.panel.treeDepthByRank')}
                                    >
                                       <SelectValue placeholder={t('taxonomy.panel.rank')}>
                                          {formatRankSelectLabel(
                                             rankSelectValue,
                                             lookupByRank[rankSelectValue],
                                          )}
                                       </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="z-[1100] max-h-72" position="popper">
                                       {TREE_RANK_FILTER_OPTIONS.map((r) => (
                                          <SelectItem
                                             key={r}
                                             value={r}
                                             disabled={isSubtreeRankDisabled(r)}
                                             textValue={formatRankFilterLabel(r)}
                                             className="items-start py-2"
                                          >
                                             <span className="whitespace-normal">
                                                {formatRankSelectLabel(r, lookupByRank[r])}
                                             </span>
                                             {isSubtreeRankDisabled(r) ? (
                                                <span className="text-muted-foreground block text-[0.65rem]">
                                                   {t('taxonomy.panel.rankTooManyLeaves')}
                                                </span>
                                             ) : null}
                                          </SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              ) : (
                                 <Select value={rankSelectValue} onValueChange={handleFullRankChange}>
                                    <SelectTrigger
                                       size="sm"
                                       className="h-auto min-h-8 w-full max-w-[min(100%,240px)] py-1.5"
                                       aria-label={t('taxonomy.panel.filterTreeByRank')}
                                    >
                                       <SelectValue placeholder={t('taxonomy.panel.rank')}>
                                          {rankSelectValue === RANK_FILTER_ALL
                                             ? t('taxonomy.panel.allRanks')
                                             : formatRankSelectLabel(
                                                  rankSelectValue,
                                                  lookupByRank[rankSelectValue],
                                               )}
                                       </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent className="z-[1100] max-h-72" position="popper">
                                       <SelectItem value={RANK_FILTER_ALL}>
                                          {t('taxonomy.panel.allRanks')}
                                       </SelectItem>
                                       {TREE_RANK_FILTER_OPTIONS.map((r) => (
                                          <SelectItem
                                             key={r}
                                             value={r}
                                             textValue={formatRankFilterLabel(r)}
                                             className="items-start py-2"
                                          >
                                             <span className="whitespace-normal">
                                                {formatRankSelectLabel(r, lookupByRank[r])}
                                             </span>
                                          </SelectItem>
                                       ))}
                                    </SelectContent>
                                 </Select>
                              )}
                           </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                           <Checkbox
                              id="taxonomy-show-labels"
                              checked={showLabels}
                              onCheckedChange={(v) => setShowLabels(v === true)}
                           />
                           <Label
                              htmlFor="taxonomy-show-labels"
                              className="text-muted-foreground cursor-pointer text-xs font-normal leading-snug"
                           >
                              {t('taxonomy.panel.showLeafLabels')}
                           </Label>
                        </div>
                        {showResetRoot ? (
                           <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 gap-1.5"
                              onClick={onResetTreeRoot}
                           >
                              <Home className="h-3.5 w-3.5" />
                              {t('taxonomy.panel.resetToPortalRoot')}
                           </Button>
                        ) : null}
                     </div>
                  </div>
               </div>

               <div className="pointer-events-auto absolute bottom-4 left-4 max-h-[min(40vh,320px)] w-[min(calc(100vw-2rem),280px)] overflow-y-auto rounded-lg border border-border bg-card/95 p-3 text-xs shadow-sm backdrop-blur lg:w-[min(320px,40%)]">
                  <div className="text-muted-foreground mb-2 text-[0.65rem] font-bold tracking-wide uppercase">
                     {t('taxonomy.panel.branchColors')}
                  </div>
                  {branchLegend.length > 0 ? (
                     <div className="space-y-1.5">
                        {branchLegend.map((item) => (
                           <div key={item.taxid} className="flex min-w-0 items-center gap-2">
                              <span
                                 className="h-3 w-3 shrink-0 rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/15"
                                 style={{ backgroundColor: item.color }}
                                 aria-hidden
                              />
                              <span className="text-foreground truncate" title={item.name}>
                                 {item.name}
                              </span>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <p className="text-muted-foreground">{t('taxonomy.panel.noBranchesToShow')}</p>
                  )}
               </div>
            </div>
         </div>
      </div>
   )
}
