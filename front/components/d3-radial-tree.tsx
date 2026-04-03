'use client'

import { useTheme } from 'next-themes'
import { useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { Network } from 'lucide-react'

import { TaxonomyNodeTooltip } from '@/components/taxonomy/taxonomy-node-tooltip'
import type { NodeClickEvent } from '@/components/taxonomy/taxonomy-types'
import { BRANCH_PALETTE_DARK, BRANCH_PALETTE_LIGHT } from '@/lib/taxonomy/treeBranchPalette'
import type { FlatTreeNode } from '@/lib/taxonomy/treeTableTypes'

function cloneHierarchyForLayout(h: d3.HierarchyNode<FlatTreeNode>): d3.HierarchyNode<FlatTreeNode> {
   const cloneData = (d: FlatTreeNode): FlatTreeNode => ({
      ...d,
      children: d.children?.map(cloneData),
   })
   return d3.hierarchy(cloneData(h.data), (d) => d.children)
}

function easeInOutCubic(t: number): number {
   return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

const LAYOUT_ANIM_MS = 550

type HitEntry = {
   node: d3.HierarchyNode<FlatTreeNode>
   cx: number
   cy: number
   hitR: number
   radialDist: number
}

export type D3RadialTreeProps = {
   hierarchy: d3.HierarchyNode<FlatTreeNode> | null
   loading?: boolean
   error?: string | null
   highlightTaxid?: string | null
   onNodeClick?: (event: NodeClickEvent) => void
   showCanvasDomainLegend?: boolean
   controlledShowLabels?: boolean
   /**
    * When this string changes (e.g. rank filter), the tree replays a scale-in transition
    * (Vue TreeOfLifeRadialTree parity). Omit or keep stable to skip transition on unrelated updates.
    */
   layoutTransitionKey?: string | null
}

export function D3RadialTree({
   hierarchy,
   loading = false,
   error = null,
   highlightTaxid = null,
   onNodeClick,
   showCanvasDomainLegend = true,
   controlledShowLabels = false,
   layoutTransitionKey = null,
}: D3RadialTreeProps) {
   const canvasRef = useRef<HTMLCanvasElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   const [hoveredNode, setHoveredNode] = useState<d3.HierarchyNode<FlatTreeNode> | null>(null)
   const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
   const hoveredNodeRef = useRef<d3.HierarchyNode<FlatTreeNode> | null>(null)
   const labelsArrayRef = useRef<
      Array<{
         node: d3.HierarchyNode<FlatTreeNode>
         x: number
         y: number
         text: string
         angle: number
         radius: number
      }>
   >([])
   const descendantHitsRef = useRef<HitEntry[]>([])
   const drawRef = useRef<((transform: d3.ZoomTransform) => void) | null>(null)
   const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
   const { resolvedTheme } = useTheme()
   const isDark = resolvedTheme === 'dark'
   const onNodeClickRef = useRef(onNodeClick)
   onNodeClickRef.current = onNodeClick

   const layoutProgressRef = useRef(1)
   const lastLayoutKeyRef = useRef<string | null>(null)
   const layoutAnimFrameRef = useRef<number | null>(null)

   useEffect(() => {
      hoveredNodeRef.current = hoveredNode
   }, [hoveredNode])

   useEffect(() => {
      const el = containerRef.current
      if (!el) return
      const ro = new ResizeObserver((entries) => {
         for (const entry of entries) {
            const { width, height } = entry.contentRect
            setContainerSize({ width, height })
         }
      })
      ro.observe(el)
      setContainerSize({ width: el.clientWidth, height: el.clientHeight })
      return () => ro.disconnect()
   }, [])

   useEffect(() => {
      if (!hierarchy || !canvasRef.current || !containerRef.current) return

      const canvas = canvasRef.current
      const container = containerRef.current
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const root = cloneHierarchyForLayout(hierarchy)
      const width = Math.max(Math.floor(containerSize.width || container.clientWidth || 0), 200)
      const height = Math.max(Math.floor(containerSize.height || container.clientHeight || 0), 200)
      const minSide = Math.min(width, height)
      const edgePad = Math.max(8, Math.min(24, minSide * 0.02))
      const outerRadius = minSide / 2 - edgePad
      const innerRadius = Math.max(
         outerRadius * 0.2,
         outerRadius - Math.min(140, outerRadius * 0.38),
      )

      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)

      const domainChildren = root.children ?? []
      const domainTaxids = domainChildren.map((c) => c.data.id).filter(Boolean)
      const domainPalette = [...(isDark ? BRANCH_PALETTE_DARK : BRANCH_PALETTE_LIGHT)]
      const color = d3.scaleOrdinal<string>().domain(domainTaxids).range(domainPalette)

      const cluster = d3.cluster<FlatTreeNode>().size([360, innerRadius]).separation(() => 1)
      cluster(root)

      const layoutKey =
         layoutTransitionKey != null && layoutTransitionKey !== ''
            ? layoutTransitionKey
            : `n-${root.descendants().length}`
      const isSameLayout = lastLayoutKeyRef.current !== null && lastLayoutKeyRef.current === layoutKey
      lastLayoutKeyRef.current = layoutKey
      layoutProgressRef.current = isSameLayout ? 1 : 0

      const getDomainTaxidForNode = (d: d3.HierarchyNode<FlatTreeNode>): string | null => {
         if (d === root) return null
         let current: d3.HierarchyNode<FlatTreeNode> | undefined = d
         while (current?.parent && current.parent !== root) {
            current = current.parent
         }
         return current?.parent === root ? current.data.id : null
      }

      const setColor = (d: d3.HierarchyNode<FlatTreeNode>) => {
         const domainTaxid = getDomainTaxidForNode(d)
         ;(d as unknown as { color: string | null }).color = domainTaxid
            ? color(domainTaxid)
            : d.parent
              ? (d.parent as unknown as { color: string }).color
              : null
         if (d.children) d.children.forEach(setColor)
      }
      setColor(root)

      const toRadians = (deg: number) => ((deg - 90) / 180) * Math.PI
      const LABEL_SPACING = 8

      const drawTreeLayer = (
         treeRoot: d3.HierarchyNode<FlatTreeNode>,
         opts: { drawLegend: boolean; alpha: number; drawRadialScale?: number },
      ) => {
         const drawScale = opts.drawRadialScale ?? 1
         const scaledRDraw = (r: number) => Math.max(1, innerRadius + (r - innerRadius) * drawScale)
         /** Final layout radius for hit-testing (stable while animating — Vue parity). */
         const scaledRPick = (r: number) => Math.max(1, innerRadius + (r - innerRadius))

         const treeLinks = treeRoot.links()
         const treeDomainChildren = treeRoot.children ?? []
         const treeDomainTaxids = treeDomainChildren.map((c) => c.data.id).filter(Boolean)
         const treeColor = d3.scaleOrdinal<string>().domain(treeDomainTaxids).range(domainPalette)

         const getDomainForNode = (d: d3.HierarchyNode<FlatTreeNode>) => {
            if (d === treeRoot) return null
            let cur: d3.HierarchyNode<FlatTreeNode> | undefined = d
            while (cur?.parent && cur.parent !== treeRoot) cur = cur.parent
            return cur?.parent === treeRoot ? cur.data.id : null
         }
         treeRoot.each((d) => {
            const domainTaxid = getDomainForNode(d)
            ;(d as unknown as { color: string | null }).color = domainTaxid
               ? treeColor(domainTaxid)
               : d.parent
                 ? (d.parent as unknown as { color: string }).color
                 : null
         })

         const treeLabelsArray: typeof labelsArrayRef.current = []
         const hits: HitEntry[] = []

         treeRoot.each((node) => {
            if (!node.data.id) return
            const pos = { x: node.x ?? 0, y: node.y ?? innerRadius }
            const nodeAngle = toRadians(pos.x)
            const rPick = scaledRPick(pos.y)
            const cx = rPick * Math.cos(nodeAngle)
            const cy = rPick * Math.sin(nodeAngle)
            const isLeaf = !node.children
            hits.push({
               node,
               cx,
               cy,
               hitR: isLeaf ? 8 : 10,
               radialDist: rPick,
            })
            if (controlledShowLabels && isLeaf) {
               const text = (node.data.scientific_name || node.data.id).replace(/_/g, ' ')
               const labelRadius = rPick + LABEL_SPACING
               treeLabelsArray.push({
                  node,
                  x: labelRadius * Math.cos(nodeAngle),
                  y: labelRadius * Math.sin(nodeAngle),
                  text,
                  angle: nodeAngle,
                  radius: labelRadius,
               })
            }
         })

         const hovered = hoveredNodeRef.current
         let pathSource: d3.HierarchyNode<FlatTreeNode> | null = hovered
         if (!pathSource && highlightTaxid) {
            let found: d3.HierarchyNode<FlatTreeNode> | null = null
            treeRoot.each((n) => {
               if (n.data.id === highlightTaxid) found = n
            })
            pathSource = found
         }
         const highlightedPath: d3.HierarchyNode<FlatTreeNode>[] = []
         if (pathSource) {
            let cur: d3.HierarchyNode<FlatTreeNode> | null = pathSource
            while (cur) {
               highlightedPath.push(cur)
               cur = cur.parent
            }
         }
         const highlightedIds = new Set(highlightedPath.map((n) => n.data.id))

         ctx.globalAlpha = opts.alpha

         treeLinks.forEach((link) => {
            const source = link.source
            const target = link.target
            const sPos = { x: source.x ?? 0, y: source.y ?? innerRadius }
            const tPos = { x: target.x ?? 0, y: target.y ?? innerRadius }
            const startAngle = toRadians(sPos.x)
            const endAngle = toRadians(tPos.x)
            const startRadius = scaledRDraw(sPos.y)
            const endRadius = scaledRDraw(tPos.y)
            const sx = startRadius * Math.cos(startAngle)
            const sy = startRadius * Math.sin(startAngle)
            const ex = endRadius * Math.cos(endAngle)
            const ey = endRadius * Math.sin(endAngle)
            const isHighlighted =
               highlightedIds.has(source.data.id) && highlightedIds.has(target.data.id)
            ctx.beginPath()
            ctx.moveTo(sx, sy)
            if (endAngle !== startAngle)
               ctx.arc(0, 0, startRadius, startAngle, endAngle, endAngle < startAngle)
            ctx.lineTo(ex, ey)
            ctx.strokeStyle = isHighlighted
               ? isDark
                  ? '#fbbf24'
                  : '#f59e0b'
               : ((target as unknown as { color: string }).color || (isDark ? '#64748b' : '#475569'))
            ctx.lineWidth = isHighlighted ? 2 : 1.5
            ctx.globalAlpha = opts.alpha
            ctx.stroke()
         })

         treeRoot.each((node) => {
            if (!node.data.id) return
            const isLeaf = !node.children
            const pos = { x: node.x ?? 0, y: node.y ?? innerRadius }
            const nodeAngle = toRadians(pos.x)
            const r = scaledRDraw(pos.y)
            const x = r * Math.cos(nodeAngle)
            const y = r * Math.sin(nodeAngle)
            const isHovered =
               hovered?.data.id === node.data.id || (highlightTaxid != null && node.data.id === highlightTaxid)
            const isHighlighted = highlightedIds.has(node.data.id)
            const radius = isLeaf ? 3 : 2.5
            ctx.beginPath()
            ctx.arc(x, y, isHovered ? radius + 1.5 : radius, 0, 2 * Math.PI)
            ctx.fillStyle = isHovered
               ? isDark
                  ? '#fbbf24'
                  : '#f59e0b'
               : ((node as unknown as { color: string }).color || (isDark ? '#64748b' : '#475569'))
            ctx.globalAlpha = (isHovered ? 1 : isHighlighted ? 0.9 : 0.75) * opts.alpha
            ctx.fill()
            if (isHovered) {
               ctx.strokeStyle = isDark ? '#fbbf24' : '#f59e0b'
               ctx.lineWidth = 1.5
               ctx.globalAlpha = 0.9 * opts.alpha
               ctx.stroke()
            }
         })

         if (controlledShowLabels) {
            ctx.font = '10px system-ui, -apple-system, sans-serif'
            treeLabelsArray.forEach(({ node, text, angle }) => {
               const py = node.y ?? innerRadius
               const labelRadiusDraw = scaledRDraw(py) + LABEL_SPACING
               const isHovered =
                  hovered?.data.id === node.data.id || (highlightTaxid != null && node.data.id === highlightTaxid)
               const angleDegrees = ((angle + Math.PI / 2) * 180) / Math.PI
               const normalizedAngleDegrees = ((angleDegrees % 360) + 360) % 360
               ctx.save()
               ctx.rotate(angle)
               ctx.translate(labelRadiusDraw, 0)
               if (normalizedAngleDegrees > 180) {
                  ctx.rotate(Math.PI)
                  ctx.textAlign = 'end'
               } else {
                  ctx.textAlign = 'start'
               }
               ctx.textBaseline = 'middle'
               ctx.fillStyle = (isHovered
                  ? isDark
                     ? '#fbbf24'
                     : '#f59e0b'
                  : isDark
                    ? '#e2e8f0'
                    : '#1e293b') as string
               ctx.font = isHovered
                  ? 'bold 10px system-ui, -apple-system, sans-serif'
                  : '10px system-ui, -apple-system, sans-serif'
               ctx.fillText(text.length > 22 ? `${text.slice(0, 22)}…` : text, 0, 0)
               ctx.restore()
            })
         }

         if (opts.drawLegend && showCanvasDomainLegend && treeDomainTaxids.length > 0) {
            const legendItems = treeDomainChildren
               .filter((c) => c.data.id)
               .map((child) => ({
                  name: child.data.scientific_name.replace(/_/g, ' '),
                  color: treeColor(child.data.id),
               }))
            const ROWS_PER_COLUMN = 15
            const ROW_HEIGHT = 20
            const COLUMN_WIDTH = 110
            const TITLE_HEIGHT = 28
            const numRows = Math.min(legendItems.length, ROWS_PER_COLUMN)
            const totalHeight = TITLE_HEIGHT + numRows * ROW_HEIGHT
            const rootName = treeRoot.data.scientific_name?.replace(/_/g, ' ') ?? 'selected taxon'
            ctx.save()
            ctx.translate(-width / 2 + 20, height / 2 - 20 - totalHeight)
            ctx.font = 'bold 13px system-ui, -apple-system, sans-serif'
            ctx.textAlign = 'left'
            ctx.textBaseline = 'top'
            ctx.fillStyle = (isDark ? '#e2e8f0' : '#1e293b') as string
            ctx.fillText(`Children of ${rootName}`, 0, 0)
            ctx.font = '12px system-ui, -apple-system, sans-serif'
            ctx.textBaseline = 'middle'
            legendItems.forEach((item, i) => {
               const col = Math.floor(i / ROWS_PER_COLUMN)
               const row = i % ROWS_PER_COLUMN
               const x = col * COLUMN_WIDTH
               const y = TITLE_HEIGHT + row * ROW_HEIGHT
               ctx.beginPath()
               ctx.arc(x + 8, y, 6, 0, 2 * Math.PI)
               ctx.fillStyle = item.color
               ctx.fill()
               ctx.fillStyle = (isDark ? '#e2e8f0' : '#1e293b') as string
               ctx.fillText(item.name, x + 20, y)
            })
            ctx.restore()
         }

         ctx.globalAlpha = 1
         descendantHitsRef.current = hits
         labelsArrayRef.current = treeLabelsArray
      }

      const draw = (transform: d3.ZoomTransform) => {
         ctx.save()
         ctx.clearRect(0, 0, width, height)
         ctx.translate((width / 2) * transform.k + transform.x, (height / 2) * transform.k + transform.y)
         ctx.scale(transform.k, transform.k)
         drawTreeLayer(root, {
            drawLegend: true,
            alpha: 1,
            drawRadialScale: layoutProgressRef.current,
         })
         ctx.restore()
      }

      drawRef.current = draw

      const zoom = d3
         .zoom<HTMLCanvasElement, unknown>()
         .scaleExtent([0.1, 50])
         .on('zoom', (event) => {
            currentTransformRef.current = event.transform
            drawRef.current?.(event.transform)
         })

      d3.select(canvas).call(zoom as unknown as d3.ZoomBehavior<HTMLCanvasElement, unknown>)

      if (!isSameLayout) {
         layoutAnimFrameRef.current = null
         const startTime = performance.now()
         const runAnim = (time: number) => {
            const elapsed = time - startTime
            const p = Math.min(elapsed / LAYOUT_ANIM_MS, 1)
            layoutProgressRef.current = easeInOutCubic(p)
            drawRef.current?.(currentTransformRef.current)
            if (p < 1) {
               layoutAnimFrameRef.current = requestAnimationFrame(runAnim)
            } else {
               layoutAnimFrameRef.current = null
               layoutProgressRef.current = 1
            }
         }
         layoutAnimFrameRef.current = requestAnimationFrame(runAnim)
      } else {
         draw(currentTransformRef.current)
      }

      const pickHit = (canvasX: number, canvasY: number): d3.HierarchyNode<FlatTreeNode> | null => {
         let best: HitEntry | null = null
         for (const h of descendantHitsRef.current) {
            const dx = canvasX - h.cx
            const dy = canvasY - h.cy
            const d = Math.sqrt(dx * dx + dy * dy)
            if (d <= h.hitR) {
               if (!best || h.radialDist > best.radialDist) best = h
            }
         }
         if (best) return best.node

         if (controlledShowLabels) {
            let closestDist = Infinity
            let foundNode: d3.HierarchyNode<FlatTreeNode> | null = null
            for (const { node, angle, radius, text } of labelsArrayRef.current) {
               const labelX = radius * Math.cos(angle)
               const labelY = radius * Math.sin(angle)
               const dx = canvasX - labelX
               const dy = canvasY - labelY
               const dist = Math.sqrt(dx * dx + dy * dy)
               const hitRadius = Math.max(20, text.length * 4)
               if (dist < hitRadius && dist < closestDist) {
                  closestDist = dist
                  foundNode = node
               }
            }
            return foundNode
         }
         return null
      }

      const handleMouseMove = (event: MouseEvent) => {
         const rect = canvas.getBoundingClientRect()
         const mouseX = event.clientX - rect.left
         const mouseY = event.clientY - rect.top
         const tooltipX = event.clientX
         const tooltipY = event.clientY
         const transform = currentTransformRef.current
         const canvasX = (mouseX - (width / 2) * transform.k - transform.x) / transform.k
         const canvasY = (mouseY - (height / 2) * transform.k - transform.y) / transform.k

         const foundNode = pickHit(canvasX, canvasY)
         canvas.style.cursor = foundNode ? 'pointer' : 'default'
         if (foundNode !== hoveredNodeRef.current) {
            hoveredNodeRef.current = foundNode
            setHoveredNode(foundNode)
            setTooltipPos(foundNode ? { x: tooltipX, y: tooltipY } : null)
            drawRef.current?.(currentTransformRef.current)
         } else if (foundNode) {
            setTooltipPos({ x: tooltipX, y: tooltipY })
         }
      }

      const handleClick = (e: MouseEvent) => {
         const h = hoveredNodeRef.current
         if (!h?.data.id) return
         onNodeClickRef.current?.({
            taxid: h.data.id,
            node: h.data,
            screenX: e.clientX,
            screenY: e.clientY,
         })
      }

      canvas.addEventListener('mousemove', handleMouseMove)
      canvas.addEventListener('click', handleClick)

      return () => {
         if (layoutAnimFrameRef.current != null) {
            cancelAnimationFrame(layoutAnimFrameRef.current)
            layoutAnimFrameRef.current = null
         }
         d3.select(canvas).on('.zoom', null)
         canvas.removeEventListener('mousemove', handleMouseMove)
         canvas.removeEventListener('click', handleClick)
      }
   }, [
      hierarchy,
      isDark,
      controlledShowLabels,
      showCanvasDomainLegend,
      highlightTaxid,
      containerSize,
      layoutTransitionKey,
   ])

   if (loading) {
      return (
         <div className="absolute inset-0 flex min-h-0 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
               <div className="border-muted border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
               <p className="text-muted-foreground text-sm">Loading tree data…</p>
            </div>
         </div>
      )
   }

   if (error) {
      return (
         <div className="absolute inset-0 flex min-h-0 items-center justify-center p-4">
            <div className="space-y-4 text-center">
               <div className="bg-destructive/10 mx-auto w-fit rounded-full px-4 py-4">
                  <Network className="text-destructive h-8 w-8" />
               </div>
               <div>
                  <p className="text-foreground mb-1 font-medium">Unable to load tree data</p>
                  <p className="text-muted-foreground text-sm">{error}</p>
               </div>
            </div>
         </div>
      )
   }

   if (!hierarchy) {
      return (
         <div className="text-muted-foreground absolute inset-0 flex min-h-0 items-center justify-center p-4 text-sm">
            No taxonomy tree
         </div>
      )
   }

   return (
      <div className="absolute inset-0 min-h-0 min-w-0">
         <div ref={containerRef} className="relative h-full w-full min-h-0 min-w-0 overflow-hidden">
            <canvas
               ref={canvasRef}
               className="absolute inset-0 block h-full w-full touch-none"
               aria-label="Taxonomy radial tree"
            />
            {hoveredNode && tooltipPos && (
               <TaxonomyNodeTooltip
                  position={tooltipPos}
                  payload={{
                     title: hoveredNode.data.scientific_name,
                     rank: hoveredNode.data.rank,
                     organismsCount: hoveredNode.data.organisms_count ?? 0,
                     assembliesCount: hoveredNode.data.assemblies_count ?? 0,
                     annotationsCount: hoveredNode.data.annotations_count ?? 0,
                  }}
               />
            )}
         </div>
      </div>
   )
}
