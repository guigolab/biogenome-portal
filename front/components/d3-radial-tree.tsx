'use client'

import { useTheme } from 'next-themes'
import {
   forwardRef,
   useEffect,
   useImperativeHandle,
   useLayoutEffect,
   useRef,
   useState,
} from 'react'
import * as d3 from 'd3'
import { Network } from 'lucide-react'

import { TaxonomyNodeTooltip } from '@/components/taxonomy/taxonomy-node-tooltip'
import type { NodeClickEvent } from '@/components/taxonomy/taxonomy-types'
import { useLocale } from '@/contexts/locale-context'
import { resolveCssVarToRgb } from '@/lib/portal/brandColorsFromDocument'
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

export type D3RadialTreeHandle = {
   /** Download the current canvas as PNG (full resolution). */
   exportPng: () => void
   /** Download an SVG wrapping the rasterized tree (same pixels as PNG). */
   exportSvg: () => void
}

function sanitizeExportBase(name: string | undefined | null): string {
   const s = (name ?? 'taxonomy-tree').trim()
   return s ? s.replace(/[^\w.-]+/g, '_').slice(0, 80) : 'taxonomy-tree'
}

function triggerDownloadDataUrl(dataUrl: string, filename: string) {
   const a = document.createElement('a')
   a.href = dataUrl
   a.download = filename
   a.rel = 'noreferrer'
   document.body.appendChild(a)
   a.click()
   document.body.removeChild(a)
}

function triggerDownloadText(text: string, filename: string, mime: string) {
   const blob = new Blob([text], { type: mime })
   const url = URL.createObjectURL(blob)
   const a = document.createElement('a')
   a.href = url
   a.download = filename
   a.rel = 'noreferrer'
   document.body.appendChild(a)
   a.click()
   document.body.removeChild(a)
   URL.revokeObjectURL(url)
}

export type D3RadialTreeProps = {
   hierarchy: d3.HierarchyNode<FlatTreeNode> | null
   loading?: boolean
   error?: string | null
   highlightTaxid?: string | null
   onNodeClick?: (event: NodeClickEvent) => void
   showCanvasDomainLegend?: boolean
   controlledShowLabels?: boolean
   /** When false, internal (branch) nodes are not drawn and are excluded from hit-testing. */
   controlledShowInternalNodes?: boolean
   /** Used for export filenames (e.g. current tree root taxid). */
   exportFileBaseName?: string | null
   /**
    * When this string changes (e.g. rank filter), the tree replays a scale-in transition
    * (Vue TreeOfLifeRadialTree parity). Omit or keep stable to skip transition on unrelated updates.
    */
   layoutTransitionKey?: string | null
}

export const D3RadialTree = forwardRef<D3RadialTreeHandle, D3RadialTreeProps>(function D3RadialTree(
   {
      hierarchy,
      loading = false,
      error = null,
      highlightTaxid = null,
      onNodeClick,
      showCanvasDomainLegend = true,
      controlledShowLabels = false,
      controlledShowInternalNodes = true,
      layoutTransitionKey = null,
      exportFileBaseName = null,
   },
   ref,
) {
   const { t } = useLocale()
   const canvasRef = useRef<HTMLCanvasElement>(null)
   const containerRef = useRef<HTMLDivElement>(null)
   /** Resolves `text-primary` via Tailwind for canvas label hover (same cascade as the UI). */
   const labelPrimaryProbeRef = useRef<HTMLSpanElement>(null)
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
   /** Tracks canvas primary-button press for pick (cannot rely on `click` — d3-zoom prevents it). */
   const pointerDownRef = useRef<{ cx: number; cy: number } | null>(null)
   const currentTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity)
   const [containerSize, setContainerSize] = useState({ width: 0, height: 0 })
   const { resolvedTheme } = useTheme()
   /** `resolvedTheme` is often undefined before next-themes hydrates; fall back to the document class (client only). */
   const isDark =
      resolvedTheme === 'dark' ||
      (typeof window !== 'undefined' && document.documentElement.classList.contains('dark'))
   const [canvasTheme, setCanvasTheme] = useState({
      highlight: 'rgb(234, 88, 12)',
      defaultLink: 'rgb(100, 116, 139)',
      legendText: 'rgb(30, 41, 59)',
      labelDefault: 'rgb(10, 10, 10)',
      /** Fallback only if DOM computed background is unavailable (exports / edge cases). */
      background: 'rgb(255, 255, 255)',
   })

   useLayoutEffect(() => {
      if (typeof document === 'undefined') return
      const root = document.documentElement
      setCanvasTheme({
         highlight: resolveCssVarToRgb(root, '--primary'),
         defaultLink: resolveCssVarToRgb(root, '--muted-foreground'),
         legendText: resolveCssVarToRgb(root, '--foreground'),
         labelDefault: resolveCssVarToRgb(root, '--foreground'),
         background: resolveCssVarToRgb(root, '--background'),
      })
   }, [resolvedTheme])
   const onNodeClickRef = useRef(onNodeClick)
   onNodeClickRef.current = onNodeClick

   /** Keep out of the canvas `useEffect` deps so URL highlight changes do not tear down d3-zoom / listeners. */
   const highlightTaxidRef = useRef<string | null>(highlightTaxid ?? null)
   highlightTaxidRef.current = highlightTaxid ?? null

   const exportFileBaseNameRef = useRef(exportFileBaseName)
   exportFileBaseNameRef.current = exportFileBaseName

   useImperativeHandle(
      ref,
      () => ({
         exportPng: () => {
            const canvas = canvasRef.current
            if (!canvas || canvas.width < 1 || canvas.height < 1) return
            try {
               const dataUrl = canvas.toDataURL('image/png')
               const base = sanitizeExportBase(exportFileBaseNameRef.current)
               triggerDownloadDataUrl(dataUrl, `${base}.png`)
            } catch {
               /* canvas may be tainted */
            }
         },
         exportSvg: () => {
            const canvas = canvasRef.current
            if (!canvas || canvas.width < 1 || canvas.height < 1) return
            try {
               const dataUrl = canvas.toDataURL('image/png')
               const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
               const w = canvas.width / dpr
               const h = canvas.height / dpr
               const base = sanitizeExportBase(exportFileBaseNameRef.current)
               const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <image width="100%" height="100%" xlink:href="${dataUrl}" preserveAspectRatio="xMidYMid meet"/>
</svg>`
               triggerDownloadText(svg, `${base}.svg`, 'image/svg+xml;charset=utf-8')
            } catch {
               /* canvas may be tainted */
            }
         },
      }),
      [],
   )

   const layoutProgressRef = useRef(1)
   const lastLayoutKeyRef = useRef<string | null>(null)
   const layoutAnimFrameRef = useRef<number | null>(null)

   useEffect(() => {
      hoveredNodeRef.current = hoveredNode
   }, [hoveredNode])

   /**
    * Always attached once. Because `containerRef` is now always in the DOM (the loading / error /
    * !hierarchy states render inside the same container div), the ref is ready on first mount.
    */
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

      /** Match `bg-background` on `container` so the canvas fill always follows the same cascade as Tailwind (avoids white fill when `resolvedTheme` is late). */
      const domBackgroundFill = (() => {
         const domBg = getComputedStyle(container).backgroundColor
         if (domBg && domBg !== 'rgba(0, 0, 0, 0)' && domBg !== 'transparent') return domBg
         return canvasTheme.background
      })()

      /** Updated in `draw()` from `text-foreground` / `text-primary` probes (never stale vs parent hooks). */
      let drawLabelFg = canvasTheme.labelDefault
      let drawLabelPrimary = canvasTheme.highlight

      const layoutKey =
         layoutTransitionKey != null && layoutTransitionKey !== ''
            ? layoutTransitionKey
            : `n-${root.descendants().length}`
      const isSameLayout = lastLayoutKeyRef.current !== null && lastLayoutKeyRef.current === layoutKey
      if (!isSameLayout) {
         currentTransformRef.current = d3.zoomIdentity
      }
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
            if (isLeaf || controlledShowInternalNodes) {
               hits.push({
                  node,
                  cx,
                  cy,
                  hitR: isLeaf ? 8 : 10,
                  radialDist: rPick,
               })
            }
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
         const hl = highlightTaxidRef.current
         let pathSource: d3.HierarchyNode<FlatTreeNode> | null = hovered
         if (!pathSource && hl) {
            let found: d3.HierarchyNode<FlatTreeNode> | null = null
            treeRoot.each((n) => {
               if (n.data.id === hl) found = n
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
               ? canvasTheme.highlight
               : ((target as unknown as { color: string }).color || canvasTheme.defaultLink)
            ctx.lineWidth = isHighlighted ? 2 : 1.5
            ctx.globalAlpha = opts.alpha
            ctx.stroke()
         })

         treeRoot.each((node) => {
            if (!node.data.id) return
            const isLeaf = !node.children
            if (!isLeaf && !controlledShowInternalNodes) return
            const pos = { x: node.x ?? 0, y: node.y ?? innerRadius }
            const nodeAngle = toRadians(pos.x)
            const r = scaledRDraw(pos.y)
            const x = r * Math.cos(nodeAngle)
            const y = r * Math.sin(nodeAngle)
            const isHovered =
               hovered?.data.id === node.data.id || (hl != null && node.data.id === hl)
            const isHighlighted = highlightedIds.has(node.data.id)
            const radius = isLeaf ? 3 : 2.5
            ctx.beginPath()
            ctx.arc(x, y, isHovered ? radius + 1.5 : radius, 0, 2 * Math.PI)
            ctx.fillStyle = isHovered
               ? canvasTheme.highlight
               : ((node as unknown as { color: string }).color || canvasTheme.defaultLink)
            ctx.globalAlpha = (isHovered ? 1 : isHighlighted ? 0.9 : 0.75) * opts.alpha
            ctx.fill()
            if (isHovered) {
               ctx.strokeStyle = canvasTheme.highlight
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
                  hovered?.data.id === node.data.id || (hl != null && node.data.id === hl)
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
               ctx.fillStyle = (isHovered ? drawLabelPrimary : drawLabelFg) as string
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
            ctx.fillStyle = drawLabelFg
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
               ctx.fillStyle = drawLabelFg
               ctx.fillText(item.name, x + 20, y)
            })
            ctx.restore()
         }

         ctx.globalAlpha = 1
         descendantHitsRef.current = hits
         labelsArrayRef.current = treeLabelsArray
      }

      const draw = (transform: d3.ZoomTransform) => {
         const fg = getComputedStyle(container).color
         drawLabelFg =
            fg && fg !== 'rgba(0, 0, 0, 0)' && fg !== 'transparent'
               ? fg
               : canvasTheme.labelDefault
         const prEl = labelPrimaryProbeRef.current
         const pr = prEl ? getComputedStyle(prEl).color : ''
         drawLabelPrimary =
            pr && pr !== 'rgba(0, 0, 0, 0)' && pr !== 'transparent'
               ? pr
               : canvasTheme.highlight

         ctx.save()
         ctx.fillStyle = domBackgroundFill
         ctx.fillRect(0, 0, width, height)
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

      /**
       * d3-zoom attaches capture-phase `mouseup` on `window` and calls `preventDefault()`, which
       * suppresses the synthetic `click` on the canvas in Chromium/WebKit — node picks never fire
       * (worse when `?taxid=` deep-link keeps highlight/redraw churn). Use mousedown + document
       * mouseup with a movement threshold instead of `click`.
       */
      const POINTER_PICK_MAX_MOVE_PX = 12

      const runNodePickFromClient = (clientX: number, clientY: number) => {
         const rect = canvas.getBoundingClientRect()
         const mouseX = clientX - rect.left
         const mouseY = clientY - rect.top
         const transform = currentTransformRef.current
         const canvasX = (mouseX - (width / 2) * transform.k - transform.x) / transform.k
         const canvasY = (mouseY - (height / 2) * transform.k - transform.y) / transform.k
         const picked = pickHit(canvasX, canvasY)
         const h = picked ?? hoveredNodeRef.current
         if (!h?.data.id) return
         onNodeClickRef.current?.({
            taxid: h.data.id,
            node: h.data,
            screenX: clientX,
            screenY: clientY,
         })
      }

      /** Must run in capture phase *before* d3-zoom’s bubble `mousedown.zoom` (that calls `stopImmediatePropagation`). */
      const handleCanvasMouseDownCapture = (e: MouseEvent) => {
         if (e.button !== 0) return
         pointerDownRef.current = { cx: e.clientX, cy: e.clientY }
      }

      const handleWindowMouseUpCapture = (e: MouseEvent) => {
         if (e.button !== 0) return
         const start = pointerDownRef.current
         pointerDownRef.current = null
         if (!start) return
         const dx = e.clientX - start.cx
         const dy = e.clientY - start.cy
         if (dx * dx + dy * dy > POINTER_PICK_MAX_MOVE_PX * POINTER_PICK_MAX_MOVE_PX) return
         /** Do not require mouseup inside canvas rect — subpixel / border cases aborted picks. */
         runNodePickFromClient(e.clientX, e.clientY)
      }

      /** Register pick tracking before `d3.zoom` so capture `mousedown` runs first on the canvas. */
      canvas.addEventListener('mousedown', handleCanvasMouseDownCapture, true)

      const zoom = d3
         .zoom<HTMLCanvasElement, unknown>()
         .scaleExtent([0.1, 50])
         .clickDistance(6)
         .on('zoom', (event) => {
            currentTransformRef.current = event.transform
            drawRef.current?.(event.transform)
         })

      const zoomBehavior = zoom as unknown as d3.ZoomBehavior<HTMLCanvasElement, unknown>
      d3.select(canvas).call(zoomBehavior)
      d3.select(canvas).call(zoomBehavior.transform, currentTransformRef.current)

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

      canvas.addEventListener('mousemove', handleMouseMove)
      /**
       * d3-zoom registers `window` capture `mouseup` and stops propagation.
       * Listen on the same target/phase so picks still fire before zoom swallows bubbling.
       */
      window.addEventListener('mouseup', handleWindowMouseUpCapture, true)

      return () => {
         if (layoutAnimFrameRef.current != null) {
            cancelAnimationFrame(layoutAnimFrameRef.current)
            layoutAnimFrameRef.current = null
         }
         d3.select(canvas).on('.zoom', null)
         canvas.removeEventListener('mousedown', handleCanvasMouseDownCapture, true)
         canvas.removeEventListener('mousemove', handleMouseMove)
         window.removeEventListener('mouseup', handleWindowMouseUpCapture, true)
      }
   }, [
      hierarchy,
      isDark,
      controlledShowLabels,
      controlledShowInternalNodes,
      showCanvasDomainLegend,
      containerSize,
      layoutTransitionKey,
      canvasTheme,
   ])

   useEffect(() => {
      drawRef.current?.(currentTransformRef.current)
   }, [highlightTaxid, resolvedTheme])

   /** Redraw when `next-themes` toggles `class` on `<html>` (often before `resolvedTheme` updates). */
   useEffect(() => {
      const el = document.documentElement
      const obs = new MutationObserver(() => {
         drawRef.current?.(currentTransformRef.current)
      })
      obs.observe(el, { attributes: true, attributeFilter: ['class'] })
      return () => obs.disconnect()
   }, [])

   /**
    * `containerRef` is always rendered so the ResizeObserver `[]`-effect can attach on first mount
    * regardless of loading / error / hierarchy state. Conditionals are inside the container.
    */
   return (
      <div className="absolute inset-0 min-h-0 min-w-0">
         <div
            ref={containerRef}
            className="bg-background text-foreground relative h-full w-full min-h-0 min-w-0 overflow-hidden"
         >
            <span
               ref={labelPrimaryProbeRef}
               className="text-primary pointer-events-none absolute left-0 top-0 size-px overflow-hidden opacity-0"
               aria-hidden
            />
            {loading ? (
               <div className="absolute inset-0 flex min-h-0 items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                     <div className="border-muted border-t-primary h-8 w-8 animate-spin rounded-full border-2" />
                     <p className="text-muted-foreground text-sm">{t('taxonomy.tree.loadingTreeData')}</p>
                  </div>
               </div>
            ) : error ? (
               <div className="absolute inset-0 flex min-h-0 items-center justify-center p-4">
                  <div className="space-y-4 text-center">
                     <div className="bg-destructive/10 mx-auto w-fit rounded-full px-4 py-4">
                        <Network className="text-destructive h-8 w-8" />
                     </div>
                     <div>
                        <p className="text-foreground mb-1 font-medium">{t('taxonomy.tree.unableToLoad')}</p>
                        <p className="text-muted-foreground text-sm">{error}</p>
                     </div>
                  </div>
               </div>
            ) : !hierarchy ? (
               <div className="text-muted-foreground absolute inset-0 flex min-h-0 items-center justify-center p-4 text-sm">
                  {t('taxonomy.tree.noTree')}
               </div>
            ) : (
               <>
                  <canvas
                     ref={canvasRef}
                     className="absolute inset-0 block h-full w-full touch-none"
                     aria-label={t('taxonomy.tree.ariaLabel')}
                  />
                  {hoveredNode && tooltipPos && (
                     <TaxonomyNodeTooltip
                        position={tooltipPos}
                        payload={{
                           title: hoveredNode.data.scientific_name,
                           rank: hoveredNode.data.rank,
                           organismsCount: hoveredNode.data.organisms_count ?? 0,
                        }}
                     />
                  )}
               </>
            )}
         </div>
      </div>
   )
})

D3RadialTree.displayName = 'D3RadialTree'
