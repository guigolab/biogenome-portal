'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Checkbox } from '@/components/ui/checkbox'
import {
   fetchTaxon,
   fetchTaxonChildren,
   type TaxonRecord,
   taxonRecordFromApi,
} from '@/lib/api/taxon'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'

interface TreeNode {
   taxid: string
   data: TaxonRecord
   children: TreeNode[]
   level: number
}

export type CompactTaxonomicTreeProps = {
   rootTaxid?: string
   rankRoots?: TaxonRecord[]
   selectedTaxons: TaxonRecord[]
   onTaxonToggle: (taxon: TaxonRecord) => void
   /** Single-select: hide checkboxes; each click sets scope to that taxon. */
   selectionMode?: 'single' | 'multi'
   maxHeight?: string
   loadingRankRoots?: boolean
   hasMoreRankRoots?: boolean
   onLoadMore?: () => void
}

export function CompactTaxonomicTree({
   rootTaxid = '2759',
   rankRoots,
   selectedTaxons,
   onTaxonToggle,
   selectionMode = 'multi',
   maxHeight = '400px',
   loadingRankRoots = false,
   hasMoreRankRoots = false,
   onLoadMore,
}: CompactTaxonomicTreeProps) {
   const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
   const [childrenData, setChildrenData] = useState<Map<string, TaxonRecord[]>>(new Map())
   const [fetchingNodes, setFetchingNodes] = useState<Set<string>>(new Set())
   const loadMoreObserverRef = useRef<HTMLDivElement>(null)

   const useRankRoots = rankRoots && rankRoots.length > 0

   const [rootNode, setRootNode] = useState<Record<string, unknown> | null>(null)
   const [isLoadingRoot, setIsLoadingRoot] = useState(!useRankRoots)

   useEffect(() => {
      if (useRankRoots) {
         setIsLoadingRoot(false)
         return
      }
      let cancelled = false
      setIsLoadingRoot(true)
      void fetchTaxon(rootTaxid)
         .then((d) => {
            if (!cancelled) setRootNode(d)
         })
         .catch(() => {
            if (!cancelled) setRootNode(null)
         })
         .finally(() => {
            if (!cancelled) setIsLoadingRoot(false)
         })
      return () => {
         cancelled = true
      }
   }, [rootTaxid, useRankRoots])

   useEffect(() => {
      if (useRankRoots) return
      if (rootNode) {
         setExpandedNodes((prev) => new Set([...prev, rootTaxid]))
      }
   }, [rootNode, rootTaxid, useRankRoots])

   useEffect(() => {
      const idsToFetch = [...expandedNodes].filter((tid) => !childrenData.has(tid))
      if (idsToFetch.length === 0) return

      let cancelled = false
      for (const tid of idsToFetch) {
         setFetchingNodes((prev) => new Set(prev).add(tid))
         void fetchTaxonChildren(tid)
            .then((rows) => {
               if (cancelled) return
               const children = rows
                  .map((r) => taxonRecordFromApi(r))
                  .sort((a, b) => (b.annotations_count ?? 0) - (a.annotations_count ?? 0))
               setChildrenData((prev) => {
                  const next = new Map(prev)
                  next.set(tid, children)
                  return next
               })
            })
            .catch(() => {
               if (cancelled) return
               setChildrenData((prev) => {
                  const next = new Map(prev)
                  next.set(tid, [])
                  return next
               })
            })
            .finally(() => {
               setFetchingNodes((prev) => {
                  const next = new Set(prev)
                  next.delete(tid)
                  return next
               })
            })
      }
      return () => {
         cancelled = true
      }
   }, [expandedNodes, childrenData])

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
      if (rootNode) {
         return [buildTree(rootTaxid, taxonRecordFromApi(rootNode), 0)]
      }
      return []
   }, [useRankRoots, rankRoots, rootNode, rootTaxid, buildTree])

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

   useEffect(() => {
      if (!hasMoreRankRoots || !onLoadMore || !useRankRoots) return

      const observer = new IntersectionObserver(
         (entries) => {
            if (entries[0]?.isIntersecting && hasMoreRankRoots && !loadingRankRoots && onLoadMore) {
               onLoadMore()
            }
         },
         {
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
   }, [hasMoreRankRoots, loadingRankRoots, onLoadMore, useRankRoots])

   const handleExpand = useCallback((taxid: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setExpandedNodes((prev) => {
         const next = new Set(prev)
         if (next.has(taxid)) {
            next.delete(taxid)
         } else {
            next.add(taxid)
         }
         return next
      })
   }, [])

   const isTaxonSelected = useCallback(
      (taxid: string) => {
         return selectedTaxons.some((t) => t.taxid === taxid)
      },
      [selectedTaxons],
   )

   if (isLoadingRoot && !useRankRoots) {
      return (
         <div className="flex items-center justify-center py-4">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            <span className="ml-2 text-xs text-muted-foreground">Loading tree…</span>
         </div>
      )
   }

   if (trees.length === 0) {
      return (
         <div className="py-4 text-center text-xs text-muted-foreground">No tree data available</div>
      )
   }

   return (
      <div className="overflow-x-auto border" style={{ maxHeight }}>
         <div className="overflow-y-auto" style={{ maxHeight }}>
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

                        {node.data.annotations_count !== undefined && node.data.annotations_count > 0 ? (
                           <span className="ml-1 shrink-0 font-mono text-[10px] text-muted-foreground">
                              {node.data.annotations_count.toLocaleString()}
                           </span>
                        ) : null}
                     </div>
                  )
               })}

               {useRankRoots && hasMoreRankRoots ? (
                  <div ref={loadMoreObserverRef} className="flex items-center justify-center py-2">
                     {loadingRankRoots ? (
                        <>
                           <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                           <span className="ml-2 text-xs text-muted-foreground">Loading more…</span>
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
