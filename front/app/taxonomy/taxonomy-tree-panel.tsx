'use client'

import { useTheme } from 'next-themes'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { D3RadialTree, type D3RadialTreeHandle } from '@/components/d3-radial-tree'
import { Button } from '@/components/ui/button'
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { SubtreeLookupResponse } from '@/lib/api/tree'
import { navRouteIcons } from '@/lib/portal'
import { getDisplayNestedRoot, useTaxonomyTreeStore } from '@/lib/stores/taxonomy-tree-store'
import { branchLegendFromHierarchy, type BranchLegendItem } from '@/lib/taxonomy/treeBranchLegend'
import { buildHierarchyFromNested } from '@/lib/taxonomy/treeHierarchy'
import { MAX_TREE_LEAVES } from '@/lib/taxonomy/taxonomyTreeLimits'
import {
   collectRanksPresentInSubtree,
   rankFilterOptionsForSubtree,
} from '@/lib/taxonomy/taxonomyTreeLoad'
import { formatRankFilterLabel } from '@/lib/taxonomy/treeRankOptions'
import { ChevronDown, Download, HelpCircle, Loader2 } from 'lucide-react'

import { type LineageEntry, useTaxonomyRootLineage } from './use-taxonomy-root-lineage'
import { TaxonomyInteractionHint } from './taxonomy-interaction-hint'

/** Portal/root first, then up to 5 ancestors above the tree root (deduped if root repeats in the tail). */
type TaxonomyLineageCrumb =
   | { kind: 'node'; entry: LineageEntry }
   | { kind: 'gap'; omittedCount: number }
   | { kind: 'placeholder' }

function buildTaxonomyLineageCrumbs(
   lineage: LineageEntry[],
   options?: { atPortalRoot?: boolean },
): TaxonomyLineageCrumb[] {
   if (lineage.length === 0) return []
   const portal = lineage[0]!
   const atPortalRoot = options?.atPortalRoot === true
   if (lineage.length === 1) {
      return atPortalRoot
         ? [{ kind: 'placeholder' }]
         : [{ kind: 'node', entry: portal }]
   }

   const ancestorsOnly = lineage.slice(0, -1)
   const tail = ancestorsOnly.slice(-5)
   const out: TaxonomyLineageCrumb[] = [{ kind: 'node', entry: portal }]
   const omittedCount = Math.max(0, lineage.length - 7)
   if (omittedCount > 0) out.push({ kind: 'gap', omittedCount })
   for (const e of tail) {
      if (e.taxid !== portal.taxid) out.push({ kind: 'node', entry: e })
   }
   return out
}

const RANK_FILTER_ALL = 'all'

const overlayCardClass =
   'bg-card/95 border-border rounded-lg border p-3 shadow-sm backdrop-blur'

function formatRankSelectLabel(rank: string, lookup?: SubtreeLookupResponse): string {
   const base = formatRankFilterLabel(rank)
   if (!lookup) return base
   return `${base} — ${lookup.total_leaves.toLocaleString()} leaves`
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
   const status = useTaxonomyTreeStore((s) => s.status)
   const error = useTaxonomyTreeStore((s) => s.error)
   const nestedTree = useTaxonomyTreeStore((s) => s.nestedTree)
   const byTaxid = useTaxonomyTreeStore((s) => s.byTaxid)
   const apiRankLevel = useTaxonomyTreeStore((s) => s.apiRankLevel)
   const lookupByRank = useTaxonomyTreeStore((s) => s.lookupByRank)
   const topologyLeafCount = useTaxonomyTreeStore((s) => s.topologyLeafCount)
   const treeRootTaxid = useTaxonomyTreeStore((s) => s.treeRootTaxid)
   const rootScientificName = useTaxonomyTreeStore((s) => s.rootScientificName)
   const portalRootTaxid = useTaxonomyTreeStore((s) => s.portalRootTaxid)
   const subtreeWarning = useTaxonomyTreeStore((s) => s.subtreeWarning)

   const { lineage, loadingLineage } = useTaxonomyRootLineage(treeRootTaxid, portalRootTaxid)

   const atPortalRoot = Boolean(
      treeRootTaxid && portalRootTaxid && treeRootTaxid === portalRootTaxid,
   )

   const lineageCrumbs = useMemo(
      () => buildTaxonomyLineageCrumbs(lineage, { atPortalRoot }),
      [lineage, atPortalRoot],
   )

   const [clientRankFilter, setClientRankFilter] = useState<string>(RANK_FILTER_ALL)
   const [showLabels, setShowLabels] = useState(true)
   const [showInternalNodes, setShowInternalNodes] = useState(true)

   const lastSyncedRootRef = useRef<string | null>(null)

   const rankForDisplay = useMemo(() => {
      return clientRankFilter === RANK_FILTER_ALL ? null : clientRankFilter
   }, [clientRankFilter])

   const hierarchy = useMemo(() => {
      if (!nestedTree) return null
      const filtered = getDisplayNestedRoot(nestedTree, rankForDisplay)
      if (!filtered) return null
      return buildHierarchyFromNested(filtered, byTaxid)
   }, [nestedTree, byTaxid, rankForDisplay])

   /** First-level branches: same colors as the canvas; tap a row to open that subtree as root. */
   const branchExploreItems = useMemo((): Array<BranchLegendItem & { count: number }> => {
      if (!hierarchy) return []
      const legend = branchLegendFromHierarchy(hierarchy, Boolean(isDark))
      const hc = hierarchy.children ?? []
      return legend
         .map((item, i) => ({
            ...item,
            count:
               hc[i]?.data.organisms_count ?? byTaxid.get(item.taxid)?.organisms_count ?? 0,
         }))
         .sort((a, b) => b.count - a.count)
   }, [hierarchy, isDark, byTaxid])

   const layoutTransitionKey = useMemo(() => {
      const root = treeRootTaxid ?? ''
      return `${root}|${clientRankFilter}`
   }, [treeRootTaxid, clientRankFilter])

   const treeExportRef = useRef<D3RadialTreeHandle>(null)

   /** NCBI rank string for the current tree root (always shown when the tree has loaded). */
   const rootScopeRank = useMemo(() => {
      if (status !== 'success' || !treeRootTaxid) return null
      if (nestedTree?.taxid === treeRootTaxid) {
         const r = nestedTree.rank?.trim()
         return r || null
      }
      return (byTaxid.get(treeRootTaxid)?.rank ?? '').trim() || null
   }, [status, nestedTree, treeRootTaxid, byTaxid])

   const navigateToRootTaxon = useCallback(
      (taxid: string) => {
         const tid = taxid.trim()
         if (!tid) return
         if (portalRootTaxid && tid === portalRootTaxid) {
            onResetTreeRoot()
         } else {
            onSetTreeRoot(tid)
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

   const presentRanksInSubtree = useMemo(() => {
      if (status !== 'success' || !nestedTree || nestedTree.taxid !== treeRootTaxid) {
         return new Set<string>()
      }
      return collectRanksPresentInSubtree(nestedTree)
   }, [status, nestedTree, treeRootTaxid])

   const fullModeRankList = useMemo(
      () => rankFilterOptionsForSubtree(lookupByRank, presentRanksInSubtree),
      [lookupByRank, presentRanksInSubtree],
   )

   useEffect(() => {
      if (status !== 'success' || !treeRootTaxid) return
      if (lastSyncedRootRef.current === treeRootTaxid) return
      lastSyncedRootRef.current = treeRootTaxid
      if (apiRankLevel == null) {
         setClientRankFilter(RANK_FILTER_ALL)
         return
      }
      const next = fullModeRankList.includes(apiRankLevel) ? apiRankLevel : RANK_FILTER_ALL
      setClientRankFilter(next)
   }, [status, treeRootTaxid, apiRankLevel, fullModeRankList])

   /** Topology leaf count for "All leaves" option — counts tip nodes in the rendered tree, not organism aggregate. */
   const allLeavesCount = status === 'success' ? topologyLeafCount : 0

   /** Drop a rank filter that no longer applies to this root or subtree. */
   useEffect(() => {
      if (clientRankFilter === RANK_FILTER_ALL) return
      if (Object.keys(lookupByRank).length === 0) return
      const leaves = lookupByRank[clientRankFilter]?.total_leaves
      if (leaves == null || leaves <= 0) {
         setClientRankFilter(RANK_FILTER_ALL)
         return
      }
      if (!fullModeRankList.includes(clientRankFilter)) {
         const next =
            apiRankLevel != null && fullModeRankList.includes(apiRankLevel)
               ? apiRankLevel
               : RANK_FILTER_ALL
         setClientRankFilter(next)
      }
   }, [clientRankFilter, lookupByRank, fullModeRankList, apiRankLevel])

   const rankSelectValue = clientRankFilter

   const loadingTree = status === 'loading' || status === 'idle'
   const treeError = status === 'error' ? error : null

   const rootTitle =
      rootScientificName?.replace(/_/g, ' ') || treeRootTaxid || '…'

   return (
      <div className="border-border relative flex min-h-0 min-w-0 flex-1 flex-col border-b bg-card/50 lg:border-b-0 lg:border-r">
         <D3RadialTree
            ref={treeExportRef}
            hierarchy={hierarchy}
            loading={loadingTree}
            error={treeError}
            highlightTaxid={selectedTaxid}
            showCanvasDomainLegend={false}
            controlledShowLabels={showLabels}
            controlledShowInternalNodes={showInternalNodes}
            layoutTransitionKey={layoutTransitionKey}
            exportFileBaseName={treeRootTaxid}
            onNodeClick={({ taxid }) => onSelectTaxon(taxid)}
         />

         <div className="pointer-events-none absolute inset-0 z-[1000]">
            <div className="pointer-events-auto absolute top-4 left-4 flex w-80 max-w-[calc(100vw-2rem)] shrink-0 flex-col gap-2">
               <TaxonomyTreeScopeCard
                  className={overlayCardClass}
                  t={t}
                  rootTitle={rootTitle}
                  treeRootTaxid={treeRootTaxid}
                  rootScopeRank={rootScopeRank}
                  treeReady={status === 'success'}
                  atPortalRoot={atPortalRoot}
                  portalRootTaxid={portalRootTaxid}
                  lineageCrumbs={lineageCrumbs}
                  loadingLineage={loadingLineage}
                  navigateToRootTaxon={navigateToRootTaxon}
               />

               {branchExploreItems.length > 0 ? (
                  <TaxonomyBranchExploreCard
                     className={overlayCardClass}
                     t={t}
                     items={branchExploreItems}
                     onSetTreeRoot={onSetTreeRoot}
                  />
               ) : null}

               <TaxonomyTreeViewCard
                  className={overlayCardClass}
                  t={t}
                  subtreeWarning={subtreeWarning}
                  rankSelectValue={rankSelectValue}
                  lookupByRank={lookupByRank}
                  fullModeRankList={fullModeRankList}
                  allLeavesCount={allLeavesCount}
                  handleFullRankChange={handleFullRankChange}
                  showLabels={showLabels}
                  setShowLabels={setShowLabels}
                  showInternalNodes={showInternalNodes}
                  setShowInternalNodes={setShowInternalNodes}
               />
            </div>

            {/* Interaction hint — bottom left */}
            <div className="pointer-events-none absolute bottom-4 left-4 w-[min(18rem,calc(100vw-5rem))]">
               <TaxonomyInteractionHint />
            </div>

            {/* Floating export button — bottom center */}
            <div className="pointer-events-auto absolute bottom-4 left-1/2 -translate-x-1/2">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="bg-card/95 border-border h-8 gap-1.5 border px-3 text-xs font-medium shadow-md backdrop-blur"
                        disabled={loadingTree || !hierarchy || status !== 'success'}
                        aria-label={t('taxonomy.panel.exportTreeAria')}
                     >
                        <Download className="size-3.5 shrink-0" aria-hidden />
                        <span>{t('taxonomy.panel.exportTree')}</span>
                        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
                     </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                     align="center"
                     side="top"
                     sideOffset={6}
                     className="z-[1100] min-w-[10rem]"
                  >
                     <DropdownMenuItem
                        className="cursor-pointer gap-2 text-xs"
                        onClick={() => treeExportRef.current?.exportPng()}
                     >
                        {t('taxonomy.panel.exportTreePng')}
                     </DropdownMenuItem>
                     <DropdownMenuItem
                        className="cursor-pointer gap-2 text-xs"
                        onClick={() => treeExportRef.current?.exportSvg()}
                     >
                        {t('taxonomy.panel.exportTreeSvg')}
                     </DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>
      </div>
   )
}

type LocaleT = (key: string) => string

function TaxonomyTreeScopeCard({
   className,
   t,
   rootTitle,
   treeRootTaxid,
   rootScopeRank,
   treeReady,
   atPortalRoot,
   portalRootTaxid,
   lineageCrumbs,
   loadingLineage,
   navigateToRootTaxon,
}: {
   className: string
   t: LocaleT
   rootTitle: string
   treeRootTaxid: string | null
   /** Raw rank from tree table when loaded; null if unknown. */
   rootScopeRank: string | null
   treeReady: boolean
   atPortalRoot: boolean
   portalRootTaxid: string | null
   /** Portal/root first, then up to five ancestors above the tree root (no duplicate root). */
   lineageCrumbs: TaxonomyLineageCrumb[]
   loadingLineage: boolean
   navigateToRootTaxon: (taxid: string) => void
}) {
   const rankLabel = treeReady
      ? formatRankFilterLabel(rootScopeRank ?? '') || '—'
      : '—'

   const TaxonomyPanelIcon = navRouteIcons.taxonomy

   return (
      <div className={className}>
         <div className="border-border/60 mb-2.5 flex items-center gap-1.5 border-b pb-2">
            <TaxonomyPanelIcon className="text-primary size-3.5 shrink-0" aria-hidden />
            <span className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
               {t('taxonomy.panel.title')}
            </span>
         </div>

         <div className="min-w-0">
            <p className="text-muted-foreground mb-1 text-[0.6rem] font-semibold tracking-wide uppercase">
               {t('taxonomy.panel.lineageAncestors')}
            </p>
            <nav aria-label={t('taxonomy.panel.lineage')}>
               {loadingLineage ? (
                  <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                     <Loader2 className="h-3 w-3 animate-spin" />
                     {t('common.loading')}
                  </div>
               ) : lineageCrumbs.length > 0 ? (
                  <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 text-xs">
                     {lineageCrumbs.map((crumb, index) => (
                        <span
                           key={
                              crumb.kind === 'node'
                                 ? `${crumb.entry.taxid}-${index}`
                                 : `${crumb.kind}-${index}`
                           }
                           className="flex min-w-0 max-w-full items-center gap-0.5"
                        >
                           {index > 0 ? (
                              <span className="text-muted-foreground px-0.5" aria-hidden>
                                 {'>'}
                              </span>
                           ) : null}
                           {crumb.kind === 'node' ? (
                              <button
                                 type="button"
                                 className="text-primary hover:underline max-w-[min(100%,10rem)] truncate text-left"
                                 title={`${t('taxonomy.panel.setTreeRootTo')} ${crumb.entry.name} (${crumb.entry.taxid})`}
                                 onClick={() => navigateToRootTaxon(crumb.entry.taxid)}
                              >
                                 {crumb.entry.name.replace(/_/g, ' ')}
                              </button>
                           ) : crumb.kind === 'gap' ? (
                              <Tooltip>
                                 <TooltipTrigger asChild>
                                    <span className="text-muted-foreground cursor-help select-none">...</span>
                                 </TooltipTrigger>
                                 <TooltipContent side="top" className="z-[1200] text-left">
                                    {crumb.omittedCount.toLocaleString()} hidden ancestors
                                 </TooltipContent>
                              </Tooltip>
                           ) : (
                              <span className="text-muted-foreground select-none">
                                 {t('taxonomy.panel.portalDefaultRoot')}
                              </span>
                           )}
                        </span>
                     ))}
                  </div>
               ) : (
                  <p className="text-muted-foreground text-xs">{t('taxonomy.panel.noLineageData')}</p>
               )}
            </nav>
         </div>

         <div className="border-border/60 mt-3 min-w-0 space-y-1.5 border-t pt-2.5">
            <p className="text-foreground text-sm font-semibold leading-snug" title={treeRootTaxid ?? ''}>
               {rootTitle}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
               <Badge
                  variant="secondary"
                  className="max-w-full px-1.5 py-0 text-[0.7rem] font-medium"
                  title={t('taxonomy.panel.rank')}
               >
                  <span className="truncate">{rankLabel}</span>
               </Badge>
               <span className="text-muted-foreground font-mono text-[0.65rem] tabular-nums">
                  {treeRootTaxid ?? '—'}
               </span>
               {atPortalRoot ? (
                  <Badge
                     variant="outline"
                     className="px-1.5 py-0 text-[0.65rem] font-normal text-muted-foreground"
                     title={t('taxonomy.panel.portalDefaultBadgeTitle')}
                  >
                     {t('taxonomy.panel.portalDefaultBadge')}
                  </Badge>
               ) : null}
            </div>
            {!atPortalRoot && portalRootTaxid ? (
               <button
                  type="button"
                  className="text-muted-foreground hover:text-primary text-[0.65rem] transition-colors hover:underline"
                  onClick={() => navigateToRootTaxon(portalRootTaxid)}
               >
                  ← {t('taxonomy.panel.resetToDefault')}
               </button>
            ) : null}
         </div>
      </div>
   )
}

function TaxonomyBranchExploreCard({
   className,
   t,
   items,
   onSetTreeRoot,
}: {
   className: string
   t: LocaleT
   items: Array<BranchLegendItem & { count: number }>
   onSetTreeRoot: (taxid: string) => void
}) {
   return (
      <div className={className}>
         <div className="mb-1.5 flex items-center gap-1">
            <span className="text-muted-foreground text-[0.65rem] font-semibold tracking-wide uppercase">
               {t('taxonomy.panel.branchExploreTitle')}
            </span>
            <Tooltip>
               <TooltipTrigger asChild>
                  <button
                     type="button"
                     className="text-muted-foreground hover:text-foreground inline-flex shrink-0 rounded-sm p-0.5 transition-colors"
                     aria-label={t('taxonomy.panel.branchExploreHelpAria')}
                  >
                     <HelpCircle className="size-3.5" aria-hidden />
                  </button>
               </TooltipTrigger>
               <TooltipContent
                  side="right"
                  className="z-[1200] max-w-[14rem] text-left"
               >
                  {t('taxonomy.panel.branchExploreHelp')}
               </TooltipContent>
            </Tooltip>
         </div>
         <ul className="max-h-[min(28vh,220px)] space-y-0.5 overflow-y-auto pr-0.5 [scrollbar-width:thin]">
            {items.map((item) => (
               <li key={item.taxid}>
                  <button
                     type="button"
                     className="hover:bg-muted/60 flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left text-xs transition-colors"
                     title={`${t('taxonomy.panel.rootTreeAt')} ${item.name} (${item.taxid})`}
                     onClick={() => onSetTreeRoot(item.taxid)}
                  >
                     <span
                        className="size-3 shrink-0 rounded-full shadow-inner ring-1 ring-black/10 dark:ring-white/15"
                        style={{ backgroundColor: item.color }}
                        aria-hidden
                     />
                     <span className="text-foreground min-w-0 flex-1 truncate font-medium">
                        {item.name}
                     </span>
                     <span className="text-muted-foreground shrink-0 font-mono text-[0.65rem] tabular-nums">
                        {item.count.toLocaleString()}
                     </span>
                  </button>
               </li>
            ))}
         </ul>
      </div>
   )
}

function TaxonomyTreeViewCard({
   className,
   t,
   subtreeWarning,
   rankSelectValue,
   lookupByRank,
   fullModeRankList,
   allLeavesCount,
   handleFullRankChange,
   showLabels,
   setShowLabels,
   showInternalNodes,
   setShowInternalNodes,
}: {
   className: string
   t: LocaleT
   subtreeWarning: boolean
   rankSelectValue: string
   lookupByRank: Record<string, SubtreeLookupResponse>
   fullModeRankList: string[]
   /** Organism count for current tree root (shown next to “All leaves”). */
   allLeavesCount: number
   handleFullRankChange: (value: string) => void
   showLabels: boolean
   setShowLabels: (v: boolean) => void
   showInternalNodes: boolean
   setShowInternalNodes: (v: boolean) => void
}) {
   const allLeavesLabel = `${t('taxonomy.panel.allLeaves')} (${allLeavesCount.toLocaleString()})`
   return (
      <div className={className}>
         <div className="border-border/60 pb-3">
            <div className="text-muted-foreground mb-2 text-[0.65rem] font-semibold tracking-wide uppercase">
               {t('taxonomy.panel.displaySectionTitle')}
            </div>
            <div className="space-y-1.5">
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
               <div className="flex flex-wrap items-center gap-2">
                  <Checkbox
                     id="taxonomy-show-internal-nodes"
                     checked={showInternalNodes}
                     onCheckedChange={(v) => setShowInternalNodes(v === true)}
                  />
                  <Label
                     htmlFor="taxonomy-show-internal-nodes"
                     className="text-muted-foreground cursor-pointer text-xs font-normal leading-snug"
                  >
                     {t('taxonomy.panel.showInternalNodes')}
                  </Label>
               </div>
            </div>
         </div>

         <div className="border-border/60 border-t pt-3">
            <div className="text-muted-foreground mb-2 text-[0.65rem] font-semibold tracking-wide uppercase">
               {t('taxonomy.panel.rankSectionTitle')}
            </div>
            {subtreeWarning ? (
               <p className="text-muted-foreground mb-2 text-xs">
                  {t('taxonomy.panel.subtreeWarningPrefix')} ({MAX_TREE_LEAVES.toLocaleString()}{' '}
                  {t('taxonomy.panel.leaves')}).
               </p>
            ) : null}
            <Select value={rankSelectValue} onValueChange={handleFullRankChange}>
               <SelectTrigger
                  size="sm"
                  className="h-auto min-h-8 w-full py-1.5"
                  aria-label={t('taxonomy.panel.filterTreeByRank')}
               >
                  <SelectValue placeholder={t('taxonomy.panel.rank')}>
                     {rankSelectValue === RANK_FILTER_ALL
                        ? allLeavesLabel
                        : formatRankSelectLabel(rankSelectValue, lookupByRank[rankSelectValue])}
                  </SelectValue>
               </SelectTrigger>
               <SelectContent className="z-[1100] max-h-72" position="popper">
                  <SelectItem value={RANK_FILTER_ALL}>{allLeavesLabel}</SelectItem>
                  {fullModeRankList.map((r) => (
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
         </div>
      </div>
   )
}
