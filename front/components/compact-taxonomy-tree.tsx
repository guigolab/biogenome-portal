'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import { fetchTaxonChildren, type TaxonRecord, taxonRecordFromApi } from '@/lib/api/taxon'
import { cn } from '@/lib/utils'
import { useRootTaxonStore } from '@/stores/root-taxon-store'
import { useTaxonomyTreeExpansionStore } from '@/stores/taxonomy-tree-expansion-store'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'

interface TreeNode {
   taxid: string
   data: TaxonRecord
   children: TreeNode[]
   level: number
}

export type CompactTaxonomicTreeProps = {
   /**
    * ``root``: load portal root from ``GET /taxons/root`` unless ``rankRoots`` is non-empty.
    * ``rankList``: never load portal root; roots come only from ``rankRoots`` (lazy pages).
    */
   variant?: 'root' | 'rankList'
   /**
    * When ``rankRoots`` is not set, the tree root is always loaded from ``GET /taxons/root``
    * (server ``ROOT_NODE``). ``rootTaxid`` is ignored in that mode.
    */
   rootTaxid?: string
   rankRoots?: TaxonRecord[]
   selectedTaxons: TaxonRecord[]
   onTaxonToggle: (taxon: TaxonRecord) => void
   /** Single-select: hide checkboxes; each click sets scope to that taxon. */
   selectionMode?: 'single' | 'multi'
   maxHeight?: string
   loadingRankRoots?: boolean
   /** True while a subsequent rank-list page is being fetched. */
   loadingMoreRankRoots?: boolean
   hasMoreRankRoots?: boolean
   onLoadMore?: () => void
   /** When true, tree fills the parent flex box (parent should be `min-h-0 flex-1`); omit fixed `maxHeight`. */
   fillContainer?: boolean
}

export function CompactTaxonomicTree({
   variant = 'root',
   rankRoots,
   selectedTaxons,
   onTaxonToggle,
   selectionMode = 'multi',
   maxHeight = '400px',
   loadingRankRoots = false,
   loadingMoreRankRoots = false,
   hasMoreRankRoots = false,
   onLoadMore,
   fillContainer = false,
}: CompactTaxonomicTreeProps) {
   const loadMoreObserverRef = useRef<HTMLDivElement>(null)
   /** Scrollport for infinite rank list; must be IntersectionObserver `root` when not using viewport. */
   const scrollContainerRef = useRef<HTMLDivElement>(null)

   const isRankListMode = variant === 'rankList'
   const useRankRoots = Boolean(rankRoots && rankRoots.length > 0)
   const skipPortalRootFetch = isRankListMode || useRankRoots

   const rootTaxon = useRootTaxonStore((s) => s.rootTaxon)
   const rootStatus = useRootTaxonStore((s) => s.status)
   const loadRootTaxon = useRootTaxonStore((s) => s.loadRootTaxon)

   const expandedNodes = useTaxonomyTreeExpansionStore((s) => s.expandedNodes)
   const childrenData = useTaxonomyTreeExpansionStore((s) => s.childrenData)
   const fetchingNodes = useTaxonomyTreeExpansionStore((s) => s.fetchingNodes)
   const expandNode = useTaxonomyTreeExpansionStore((s) => s.expandNode)
   const toggleNode = useTaxonomyTreeExpansionStore((s) => s.toggleNode)
   const setChildren = useTaxonomyTreeExpansionStore((s) => s.setChildren)
   const setFetching = useTaxonomyTreeExpansionStore((s) => s.setFetching)

   const resolvedRootTaxid = String(rootTaxon?.taxid ?? '')
   const isLoadingRoot = rootStatus === 'loading' || rootStatus === 'idle'

   useEffect(() => {
      if (skipPortalRootFetch) return
      void loadRootTaxon()
   }, [skipPortalRootFetch, loadRootTaxon])

   useEffect(() => {
      if (skipPortalRootFetch) return
      if (rootTaxon && resolvedRootTaxid) {
         expandNode(resolvedRootTaxid)
      }
   }, [rootTaxon, resolvedRootTaxid, skipPortalRootFetch, expandNode])

   useEffect(() => {
      const idsToFetch = [...expandedNodes].filter(
         (tid) => !childrenData.has(tid) && !fetchingNodes.has(tid),
      )
      if (idsToFetch.length === 0) return

      for (const tid of idsToFetch) {
         setFetching(tid, true)
         void fetchTaxonChildren(tid)
            .then((rows) => {
               const children = rows
                  .map((r) => taxonRecordFromApi(r))
                  .sort((a, b) => (b.organisms_count ?? 0) - (a.organisms_count ?? 0))
               setChildren(tid, children)
            })
            .catch(() => {
               setChildren(tid, [])
            })
            .finally(() => {
               setFetching(tid, false)
            })
      }
   }, [expandedNodes, childrenData, fetchingNodes, setChildren, setFetching])

   const buildTree = useCallback(
      (taxid: string, data: TaxonRecord, level: number = 0): TreeNode => {
         const children = childrenData.get(taxid) || []
         const expanded = expandedNodes.has(taxid)

         const node: TreeNode = {
            taxid,
            data: {
               ...data,
               organisms_count: data.organisms_count ?? 0,
               assemblies_count: data.assemblies_count ?? 0,
               annotations_count: data.annotations_count ?? 0,
            },
            children: [],
            level,
         }

         if (expanded && children.length > 0) {
            node.children = children.map((child) => buildTree(child.taxid, child, level + 1))
         }

         return node
      },
      [childrenData, expandedNodes],
   )

   const trees = useMemo(() => {
      if (useRankRoots && rankRoots) {
         return rankRoots.map((root) => buildTree(root.taxid, root, 0))
      }
      if (rootTaxon && resolvedRootTaxid) {
         return [buildTree(resolvedRootTaxid, taxonRecordFromApi(rootTaxon), 0)]
      }
      return []
   }, [useRankRoots, rankRoots, rootTaxon, resolvedRootTaxid, buildTree])

   const flattenedNodes = useMemo(() => {
      if (trees.length === 0) return []

      const nodes: TreeNode[] = []
      const stack: TreeNode[] = [...trees].reverse()

      while (stack.length > 0) {
         const node = stack.pop()!
         nodes.push(node)
         for (let i = node.children.length - 1; i >= 0; i--) {
            stack.push(node.children[i])
         }
      }

      return nodes
   }, [trees])

   const rankListPaging = isRankListMode || useRankRoots

   useEffect(() => {
      if (!hasMoreRankRoots || !onLoadMore || !rankListPaging) return

      const scrollRoot = fillContainer ? scrollContainerRef.current : null
      const observer = new IntersectionObserver(
         (entries) => {
            if (
               entries[0]?.isIntersecting &&
               hasMoreRankRoots &&
               !loadingRankRoots &&
               !loadingMoreRankRoots &&
               onLoadMore
            ) {
               onLoadMore()
            }
         },
         {
            root: scrollRoot ?? undefined,
            rootMargin: '50px',
            threshold: 0.1,
         },
      )

      const currentTarget = loadMoreObserverRef.current
      if (currentTarget) {
         observer.observe(currentTarget)
      }

      return () => {
         if (currentTarget) {
            observer.unobserve(currentTarget)
         }
      }
   }, [
      hasMoreRankRoots,
      loadingRankRoots,
      loadingMoreRankRoots,
      onLoadMore,
      rankListPaging,
      fillContainer,
   ])

   const handleExpand = useCallback(
      (taxid: string, e: React.MouseEvent) => {
         e.stopPropagation()
         toggleNode(taxid)
      },
      [toggleNode],
   )

   const isTaxonSelected = useCallback(
      (taxid: string) => {
         return selectedTaxons.some((t) => t.taxid === taxid)
      },
      [selectedTaxons],
   )

   if (!isRankListMode && isLoadingRoot && !useRankRoots) {
      return (
         <div className="flex items-center justify-center py-4">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading tree...</span>
         </div>
      )
   }

   if (isRankListMode && loadingRankRoots && trees.length === 0) {
      return (
         <div className="flex items-center justify-center py-4">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading taxa...</span>
         </div>
      )
   }

   if (trees.length === 0) {
      return (
         <div className="py-4 text-center text-xs text-muted-foreground">
            {isRankListMode ? 'No taxa at this rank' : 'No tree data available'}
         </div>
      )
   }

   return (
      <div
         className={
            fillContainer
               ? 'flex h-full min-h-0 flex-col overflow-hidden'
               : 'overflow-x-auto border'
         }
         style={fillContainer ? undefined : { maxHeight }}
      >
         <div
            ref={fillContainer ? scrollContainerRef : undefined}
            className={fillContainer ? 'min-h-0 flex-1 overflow-x-auto overflow-y-auto' : 'overflow-y-auto'}
            style={fillContainer ? undefined : { maxHeight }}
         >
            <div className="min-w-max space-y-0.5 p-1.5">
               {flattenedNodes.map((node) => {
                  const children = childrenData.get(node.taxid)
                  const hasFetched = childrenData.has(node.taxid)
                  const hasChildren = hasFetched ? (children?.length ?? 0) > 0 : true
                  const isExpanded = expandedNodes.has(node.taxid)
                  const isFetching = fetchingNodes.has(node.taxid)
                  const isSelected = isTaxonSelected(node.taxid)
                  const indent = node.level * 10

                  return (
                     <div
                        key={node.taxid}
                        className={cn(
                           'flex min-h-[20px] items-center gap-1 rounded px-1 py-0.5 text-xs transition-colors hover:bg-muted/50',
                           isSelected && 'bg-primary/10',
                        )}
                        style={{ paddingLeft: `${indent + 2}px` }}
                     >
                        {hasChildren ? (
                           <button
                              type="button"
                              onClick={(e) => {
                                 e.stopPropagation()
                                 handleExpand(node.taxid, e)
                              }}
                              className="flex h-3 w-3 shrink-0 items-center justify-center rounded transition-colors hover:bg-muted/80"
                              disabled={isFetching}
                              title={isExpanded ? 'Collapse' : 'Expand'}
                           >
                              {isFetching ? (
                                 <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                              ) : isExpanded ? (
                                 <ChevronDown className="h-2.5 w-2.5 text-muted-foreground" />
                              ) : (
                                 <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
                              )}
                           </button>
                        ) : (
                           <div className="w-3 shrink-0" />
                        )}

                        {selectionMode === 'multi' ? (
                           <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => {
                                 onTaxonToggle(node.data)
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="h-3 w-3"
                           />
                        ) : null}

                        <button
                           type="button"
                           onClick={(e) => {
                              e.stopPropagation()
                              onTaxonToggle(node.data)
                           }}
                           className={cn(
                              'min-w-0 flex-1 truncate text-left text-xs hover:underline',
                              isSelected && 'font-medium',
                           )}
                           title={`${node.data.scientific_name || node.taxid}${node.data.rank ? ` (${node.data.rank})` : ''}`}
                        >
                           {node.data.scientific_name || node.taxid}
                        </button>

                        <span
                           className="ml-1 shrink-0 font-mono text-[10px] text-muted-foreground tabular-nums"
                           title="Organisms in portal"
                        >
                           {node.data.organisms_count > 0
                              ? node.data.organisms_count.toLocaleString()
                              : '-'}
                        </span>
                     </div>
                  )
               })}

               {rankListPaging && hasMoreRankRoots ? (
                  <div ref={loadMoreObserverRef} className="flex items-center justify-center py-2">
                     {loadingRankRoots || loadingMoreRankRoots ? (
                        <>
                           <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                           <span className="ml-2 text-xs text-muted-foreground">Loading more...</span>
                        </>
                     ) : (
                        <span className="text-xs text-muted-foreground">Scroll for more</span>
                     )}
                  </div>
               ) : null}
            </div>
         </div>
      </div>
   )
}
