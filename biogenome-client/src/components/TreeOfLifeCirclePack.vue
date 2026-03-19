<template>
   <div class="tree-pack">
      <div v-if="isLoading" class="tree-pack__loading">
         <VaProgressCircle indeterminate size="small" color="primary" />
         <p class="tree-pack__loading-text">{{ t('tree.loading') }}</p>
      </div>
      <div v-else-if="error" class="tree-pack__error">
         <VaIcon name="fa-triangle-exclamation" size="large" color="danger" />
         <p class="tree-pack__error-title">{{ t('tree.loadError') }}</p>
         <p class="tree-pack__error-desc va-text-secondary">{{ error }}</p>
      </div>
      <template v-else>
         <div class="tree-pack__toolbar">
            <div class="tree-pack__legend">
               <span class="tree-pack__legend-item">
                  <span class="tree-pack__dot tree-pack__dot--group" :style="{ background: palette.primary }" />
                  {{ t('tree.legendGroup') }}
               </span>
               <span class="tree-pack__legend-sep" />
               <span class="tree-pack__legend-item">
                  <span class="tree-pack__dot tree-pack__dot--species" :style="{ background: palette.success }" />
                  {{ t('tree.legendSpecies') }}
               </span>
               <span class="tree-pack__legend-sep" />
               <span class="tree-pack__legend-item">
                  <span class="tree-pack__dot tree-pack__dot--selected" :style="{ background: palette.warning }" />
                  {{ t('tree.legendSelected') }}
               </span>
            </div>
            <span class="tree-pack__interaction-hint">
               {{ t('tree.packHint') }}
            </span>
         </div>

         <div ref="containerRef" class="tree-pack__container">
            <canvas ref="canvasRef" class="tree-pack__canvas" />

            <Transition name="tree-pack-tooltip">
               <div
                  v-if="hoveredNode && tooltipPos"
                  class="tree-pack__tooltip"
                  :style="{ left: `${tooltipPos.x + 12}px`, top: `${tooltipPos.y - 12}px` }"
               >
                  <div class="tree-pack__tooltip-inner">
                     <div class="tree-pack__tooltip-name">{{ hoveredNode.data.name || hoveredNode.data.taxid }}</div>
                     <div class="tree-pack__tooltip-meta va-text-secondary">
                        <span class="tree-pack__tooltip-row">
                           <VaIcon name="fa-layer-group" size="11px" />
                           {{ formatRank(hoveredNode.data.rank ?? '') }}
                        </span>
                        <span v-if="hoveredNode.data.leaves" class="tree-pack__tooltip-row">
                           <VaIcon
                              :name="iconMap.organisms?.icon ?? 'fa-paw'"
                              size="11px"
                           />
                           {{ formatCount(hoveredNode.data.leaves ?? 0) }} {{ t('tree.leaves') }}
                        </span>
                        <span class="tree-pack__tooltip-row tree-pack__tooltip-taxid">
                           <VaIcon name="fa-hashtag" size="11px" />
                           {{ hoveredNode.data.taxid }}
                        </span>
                     </div>
                  </div>
               </div>
            </Transition>
         </div>
      </template>
   </div>
</template>

<script setup lang="ts">
   import * as d3 from 'd3'
   import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
   import { useI18n } from 'vue-i18n'
   import { useTaxonomyStore } from '../stores/taxonomy-store'
   import { useAppSettings } from '../composable/useApplicationSettings'
   import { iconMap } from '../composable/useIconMap'
   import type { TaxonNode } from '../data/types'

   const props = withDefaults(
      defineProps<{
         title?: string
         rootTaxid?: string | null
         highlightTaxid?: string | null
      }>(),
      {
         rootTaxid: null,
         highlightTaxid: null,
      },
   )

   const emit = defineEmits<{
      (e: 'taxonSelect', taxid: string, taxon: TaxonNode): void
   }>()

   const { t } = useI18n()
   const taxonomyStore = useTaxonomyStore()
   const { configs } = useAppSettings()

   const canvasRef = ref<HTMLCanvasElement | null>(null)
   const containerRef = ref<HTMLDivElement | null>(null)
   const hoveredNode = ref<d3.HierarchyRectangularNode<any> | null>(null)
   const tooltipPos = ref<{ x: number; y: number } | null>(null)
   const currentTransformRef = ref<d3.ZoomTransform>(d3.zoomIdentity)
   const hoveredNodeRef = ref<d3.HierarchyRectangularNode<any> | null>(null)
   const nodesArrayRef = ref<any[]>([])
   const drawFunctionRef = ref<((transform: d3.ZoomTransform) => void) | null>(null)
   let zoomBehaviorRef: d3.ZoomBehavior<HTMLCanvasElement, unknown> | null = null
   let animationFrameId: number | null = null
   let mouseMoveTimeout: ReturnType<typeof setTimeout> | null = null
   let cleanupTree: (() => void) | null = null

   const palette = computed(() => {
      const vars = configs.value?.ui?.colors?.variables ?? {}
      return {
         primary: vars.primary || '#334155',
         secondary: vars.secondary || '#64748b',
         success: vars.success || '#22c55e',
         warning: vars.warning || '#f59e0b',
         backgroundBorder: vars.backgroundBorder || '#cbd5e1',
         textOnDark: '#ffffff',
      }
   })

   const treeStructure = computed(() => {
      const data = taxonomyStore.treeData
      if (!data || typeof data !== 'object') return null
      if (props.rootTaxid) {
         const found = findSubtree(data, props.rootTaxid)
         return found ?? data
      }
      return data
   })

   const isLoading = computed(() => taxonomyStore.isTreeLoading)
   const error = computed(() =>
      taxonomyStore.treeData === null && !taxonomyStore.isTreeLoading ? (t('tree.noData') || 'No tree data') : null,
   )

   function findSubtree(node: any, taxid: string): any | null {
      if (node?.taxid === taxid) return node
      for (const child of node?.children ?? []) {
         const found = findSubtree(child, taxid)
         if (found) return found
      }
      return null
   }

   function formatCount(n: number) {
      if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
      if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
      return n.toLocaleString()
   }

   function formatRank(rank: string) {
      return rank ? rank.charAt(0).toUpperCase() + rank.slice(1).replace(/_/g, ' ') : ''
   }

   onMounted(async () => {
      if (!taxonomyStore.treeData) await taxonomyStore.getTree()
      initTree()
   })

   watch(
      () => treeStructure.value,
      async () => {
         await nextTick()
         initTree()
      },
   )

   function initTree() {
      if (cleanupTree) {
         cleanupTree()
         cleanupTree = null
      }
      const root = treeStructure.value
      const canvas = canvasRef.value
      const container = containerRef.value
      if (!root || !canvas || !container) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const width = container.clientWidth
      const height = 800
      const dpr = window.devicePixelRatio || 1
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.scale(dpr, dpr)

      const hierarchy = d3.hierarchy(root, (d: any) => d.children)
      hierarchy.sum((d: any) => Math.max(d.leaves ?? 0, 1))

      const packLayout = d3
         .pack<any>()
         .size([width - 40, height - 40])
         .padding(3)

      const packNodes = packLayout(hierarchy)
      const allNodes = packNodes.descendants()

      const nodesArray = allNodes.map((d: any) => ({
         node: d,
         x: d.x,
         y: d.y,
         radius: d.r,
      }))
      nodesArrayRef.value = nodesArray

      const isInView = (
         x: number,
         y: number,
         r: number,
         transform: d3.ZoomTransform,
         margin = 50,
      ) => {
         const screenX = x * transform.k + transform.x
         const screenY = y * transform.k + transform.y
         const screenR = r * transform.k
         return (
            screenX + screenR > -margin &&
            screenX - screenR < width + margin &&
            screenY + screenR > -margin &&
            screenY - screenR < height + margin
         )
      }

      const draw = (transform: d3.ZoomTransform) => {
         ctx.save()
         ctx.clearRect(0, 0, width, height)
         ctx.translate(transform.x, transform.y)
         ctx.scale(transform.k, transform.k)
         const zoomLevel = transform.k

         const sortedNodes = [...nodesArray].sort((a, b) => b.radius - a.radius)
         for (const item of sortedNodes) {
            const { x, y, radius } = item
            if (!isInView(x, y, radius, transform)) continue

            const d = item.node
            const isHovered =
               (hoveredNodeRef.value && hoveredNodeRef.value.data.taxid === d.data.taxid) ||
               (props.highlightTaxid != null && d.data.taxid === props.highlightTaxid)
            const hasChildren = d.children && d.children.length > 0

            ctx.beginPath()
            ctx.arc(x, y, radius, 0, 2 * Math.PI)
            if (isHovered) {
               ctx.fillStyle = palette.value.warning
               ctx.globalAlpha = 0.85
            } else if (hasChildren) {
               ctx.fillStyle = palette.value.primary
               ctx.globalAlpha = 0.18 + 0.08 * Math.min(d.depth, 5)
            } else {
               ctx.fillStyle = palette.value.success
               ctx.globalAlpha = 0.75
            }
            ctx.fill()
            ctx.globalAlpha = 1

            ctx.beginPath()
            ctx.arc(x, y, radius, 0, 2 * Math.PI)
            ctx.strokeStyle = isHovered ? palette.value.warning : palette.value.backgroundBorder
            ctx.lineWidth = (isHovered ? 2.5 : 1) / transform.k
            ctx.globalAlpha = isHovered ? 0.95 : 0.5
            ctx.stroke()
            ctx.globalAlpha = 1
         }

         if (zoomLevel > 0.5) {
            const labelCandidates = [...nodesArray]
               .sort((a, b) => b.radius - a.radius)
               .filter((item) => item.radius * transform.k >= 20)

            const renderedLabels: Array<{ x: number; y: number; width: number; height: number }> = []
            ctx.save()
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
            ctx.textBaseline = 'middle'
            ctx.textAlign = 'center'

            for (const item of labelCandidates) {
               const { x, y, radius } = item
               if (!isInView(x, y, radius, transform)) continue

               const d = item.node
               const screenRadius = radius * transform.k
               const screenX = x * transform.k + transform.x
               const screenY = y * transform.k + transform.y

               const name = d.data.name || d.data.taxid || ''
               const maxChars = Math.max(8, Math.floor(screenRadius / 3.5))
               const displayName = name.length > maxChars ? name.substring(0, maxChars) + '...' : name

               const fontSize = Math.max(8, Math.min(14, screenRadius / 4.5))
               ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`
               const metrics = ctx.measureText(displayName)
               const textWidth = metrics.width
               const textHeight = fontSize

               const hasCollision = renderedLabels.some(
                  (label) =>
                     Math.abs(screenX - label.x) < (textWidth + label.width) / 2 + 5 &&
                     Math.abs(screenY - label.y) < (textHeight + label.height) / 2 + 5,
               )
               if (hasCollision) continue

               ctx.fillStyle = palette.value.textOnDark
               ctx.fillText(displayName, screenX, screenY)
               renderedLabels.push({ x: screenX, y: screenY, width: textWidth, height: textHeight })
               if (renderedLabels.length > 100) break
            }
            ctx.restore()
         }
         ctx.restore()
      }

      drawFunctionRef.value = draw

      const debouncedDraw = (transform: d3.ZoomTransform) => {
         if (animationFrameId) cancelAnimationFrame(animationFrameId)
         animationFrameId = requestAnimationFrame(() => draw(transform))
      }

      const zoom = d3.zoom<HTMLCanvasElement, unknown>().scaleExtent([0.05, 50]).on('zoom', (event) => {
         currentTransformRef.value = event.transform
         debouncedDraw(event.transform)
      })

      zoomBehaviorRef = zoom
      d3.select(canvas).call(zoom as any)

      const handleMouseMove = (event: MouseEvent) => {
         const rect = canvas.getBoundingClientRect()
         const mouseX = event.clientX - rect.left
         const mouseY = event.clientY - rect.top
         const transform = currentTransformRef.value

         const canvasX = (mouseX - transform.x) / transform.k
         const canvasY = (mouseY - transform.y) / transform.k

         if (mouseMoveTimeout) return
         mouseMoveTimeout = setTimeout(() => {
            mouseMoveTimeout = null
            let found: (typeof nodesArray)[0] | null = null
            let smallestRadius = Infinity

            for (const item of nodesArray) {
               const dx = canvasX - item.x
               const dy = canvasY - item.y
               const distance = Math.sqrt(dx * dx + dy * dy)
               if (distance <= item.radius && item.radius < smallestRadius) {
                  found = item
                  smallestRadius = item.radius
               }
            }

            const node = found?.node ?? null
            const current = hoveredNodeRef.value
            if (node !== current) {
               hoveredNodeRef.value = node
               hoveredNode.value = node
               if (node) {
                  tooltipPos.value = { x: mouseX, y: mouseY }
               } else {
                  tooltipPos.value = null
               }
               debouncedDraw(transform)
            } else if (node) {
               tooltipPos.value = { x: mouseX, y: mouseY }
            }

            canvas.style.cursor = node ? 'pointer' : 'default'
         }, 16)
      }

      const handleClick = () => {
         const node = hoveredNodeRef.value
         if (!node) return
         emit('taxonSelect', node.data.taxid, node.data)
      }

      const handleMouseLeave = () => {
         if (mouseMoveTimeout) {
            clearTimeout(mouseMoveTimeout)
            mouseMoveTimeout = null
         }
         if (hoveredNodeRef.value) {
            hoveredNodeRef.value = null
            hoveredNode.value = null
            tooltipPos.value = null
            debouncedDraw(currentTransformRef.value)
         }
      }

      canvas.addEventListener('mousemove', handleMouseMove)
      canvas.addEventListener('click', handleClick)
      canvas.addEventListener('mouseleave', handleMouseLeave)

      d3.select(canvas).call(zoom.transform as any, d3.zoomIdentity.translate(0, 0).scale(1))

      cleanupTree = () => {
         if (animationFrameId) cancelAnimationFrame(animationFrameId)
         if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout)
         canvas.removeEventListener('mousemove', handleMouseMove)
         canvas.removeEventListener('click', handleClick)
         canvas.removeEventListener('mouseleave', handleMouseLeave)
      }
   }

   watch(
      () => [palette.value, props.highlightTaxid],
      () => {
         if (drawFunctionRef.value && currentTransformRef.value) {
            drawFunctionRef.value(currentTransformRef.value)
         }
      },
   )

   defineExpose({
      resetView() {
         if (zoomBehaviorRef && canvasRef.value) {
            d3.select(canvasRef.value)
               .transition()
               .duration(600)
               .call(zoomBehaviorRef.transform as any, d3.zoomIdentity)
         }
      },
   })

   onBeforeUnmount(() => {
      if (cleanupTree) cleanupTree()
      if (animationFrameId) cancelAnimationFrame(animationFrameId)
      if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout)
   })
</script>

<style lang="scss" scoped>
   .tree-pack {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.625rem;
   }

   /* ── Toolbar (legend + interaction hint) ── */
   .tree-pack__toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.5rem 1rem;
      padding: 0 0.125rem;
   }
   .tree-pack__legend {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      flex-wrap: wrap;
   }
   .tree-pack__legend-item {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.75rem;
      color: var(--va-text-secondary);
      font-weight: 500;
   }
   .tree-pack__legend-sep {
      display: inline-block;
      width: 1px;
      height: 0.875rem;
      background: var(--va-background-border, rgba(0, 0, 0, 0.1));
      margin: 0 0.125rem;
   }
   .tree-pack__dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      display: inline-block;
   }
   .tree-pack__dot--group {
      opacity: 0.55;
   }
   .tree-pack__dot--species {
      opacity: 0.8;
   }
   .tree-pack__dot--selected {
      opacity: 1;
   }
   .tree-pack__interaction-hint {
      font-size: 0.7rem;
      color: var(--va-text-secondary);
      opacity: 0.7;
      white-space: nowrap;
   }

   /* ── Canvas container ── */
   .tree-pack__container {
      position: relative;
      width: 100%;
      overflow: hidden;
      height: 800px;
      border-radius: 10px;
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.06));
      background: var(--va-background-primary);
   }
   .tree-pack__canvas {
      width: 100%;
      height: 100%;
      display: block;
   }

   /* ── Tooltip ── */
   .tree-pack__tooltip {
      position: absolute;
      z-index: 50;
      pointer-events: none;
   }
   .tree-pack__tooltip-inner {
      background: var(--va-background-primary);
      border: 1px solid var(--va-background-border, rgba(0, 0, 0, 0.1));
      border-radius: 8px;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
      padding: 0.625rem 0.875rem;
      font-size: 0.875rem;
      white-space: nowrap;
      backdrop-filter: blur(4px);
   }
   .tree-pack__tooltip-name {
      font-weight: 600;
      margin-bottom: 0.375rem;
      color: var(--va-text-primary);
      font-style: italic;
   }
   .tree-pack__tooltip-meta {
      font-size: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
   }
   .tree-pack__tooltip-row {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
   }
   .tree-pack__tooltip-taxid {
      font-family: ui-monospace, monospace;
      font-size: 0.7rem;
      opacity: 0.7;
   }
   .tree-pack-tooltip-enter-active {
      transition: opacity 0.12s ease, transform 0.12s ease;
   }
   .tree-pack-tooltip-leave-active {
      transition: opacity 0.08s ease;
   }
   .tree-pack-tooltip-enter-from {
      opacity: 0;
      transform: scale(0.96) translateY(2px);
   }
   .tree-pack-tooltip-leave-to {
      opacity: 0;
   }

   /* ── Loading state ── */
   .tree-pack__loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      min-height: 20rem;
      padding: 4rem 1rem;
   }
   .tree-pack__loading-text {
      margin: 0;
      font-size: 0.875rem;
      color: var(--va-text-secondary);
   }

   /* ── Error state ── */
   .tree-pack__error {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      min-height: 20rem;
      padding: 4rem 1rem;
      text-align: center;
   }
   .tree-pack__error-title {
      margin: 0 0 0.125rem 0;
      font-weight: 600;
      font-size: 1rem;
   }
   .tree-pack__error-desc {
      margin: 0;
      font-size: 0.8125rem;
   }
</style>
