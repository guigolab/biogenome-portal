<template>
   <section class="sankey-module" aria-labelledby="sankey-module-title">
      <CmsCard
         title="Species ↔ Submitted Biosamples"
         description="Relationship between your assigned species and EBI biosamples you have submitted."
         icon="fa-diagram-project"
         color="teal"
         :loading="isLoading"
      >
         <!-- Empty state -->
         <template v-if="!isLoading">
            <DashboardEmptyState
               v-if="graph.links.length === 0"
               icon="fa-diagram-project"
               title="No relationships yet"
               description="Submit biosamples linked to your assigned species to see them visualised here."
            >
               <template #actions>
                  <CmsBtn :to="{ name: 'publish-biosample' }" icon="fa-plus" variant="primary">
                     Submit Biosample
                  </CmsBtn>
               </template>
            </DashboardEmptyState>

            <template v-else>
               <!-- Scrollable chart area (fills card body; tall SVG scrolls inside) -->
               <div ref="chartScrollRef" class="sankey-module__chart-scroll">
                  <div class="sankey-wrap" aria-hidden="true" style="padding: 0.75rem 1.25rem">
                     <svg ref="svgRef" class="sankey-svg" />
                  </div>
               </div>

               <!-- Fallback drilldown table -->
               <details class="sankey-details" style="padding: 0 1.25rem 0.75rem">
                  <summary class="sankey-details__summary">
                     <CmsIcon name="fa-table" size="small" />
                     View as table
                  </summary>
                  <table class="cms-table cms-table--compact sankey-details__table" role="grid">
                     <thead>
                        <tr class="cms-table__head-row">
                           <th class="cms-table__th">Species</th>
                           <th class="cms-table__th">Biosample name</th>
                           <th class="cms-table__th">Accession</th>
                        </tr>
                        </thead>
                        <tbody>
                           <tr
                              v-for="(link, i) in graph.links"
                              :key="i"
                              class="cms-table__row"
                           >
                              <td class="cms-table__td">
                                 <span class="cms-table__sci-name">{{ link.scientificName }}</span>
                              </td>
                              <td class="cms-table__td cms-table__td--mono">{{ link.biosampleName }}</td>
                              <td class="cms-table__td">
                                 <router-link
                                    v-if="link.biosampleAccession"
                                    :to="{ name: 'item', params: { model: 'biosamples', id: link.biosampleAccession } }"
                                    class="cms-accession-link"
                                 >
                                    {{ link.biosampleAccession }}
                                 </router-link>
                                 <span v-else class="cms-table__muted">—</span>
                              </td>
                           </tr>
                        </tbody>
                     </table>
                  </details>
               </template>
            </template>
      </CmsCard>
   </section>
</template>

<script setup lang="ts">
   import { onMounted, onUnmounted, ref, watch, nextTick } from 'vue'
   import * as d3 from 'd3'
   // @ts-ignore — d3-sankey types may not be bundled
   import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey'
   import { useGlobalStore } from '../../../stores/global-store'
   import AuthService from '../../../services/AuthService'
   import EBIService from '../../../services/EBIService'
   import { useSpeciesBiosampleGraph } from '../../../composable/useSpeciesBiosampleGraph'
   import CmsCard from './CmsCard.vue'
   import CmsIcon from '../ui/CmsIcon.vue'
   import CmsBtn from '../ui/CmsBtn.vue'
   import DashboardEmptyState from './DashboardEmptyState.vue'

   const globalStore = useGlobalStore()
   const svgRef = ref<SVGSVGElement | null>(null)
   const chartScrollRef = ref<HTMLElement | null>(null)
   let resizeObserver: ResizeObserver | null = null

   const isLoading = ref(false)
   const organisms = ref<Record<string, any>[]>([])
   const biosamples = ref<Record<string, any>[]>([])

   const { graph } = useSpeciesBiosampleGraph(organisms, biosamples)

   async function fetchData() {
      isLoading.value = true
      try {
         const [orgRes, bsRes] = await Promise.all([
            AuthService.getUserSpecies(globalStore.userName, { limit: 200 }),
            EBIService.getSubmittedBioSamples({ user: globalStore.userName, limit: 500 }),
         ])
         organisms.value = orgRes.data.data ?? []
         biosamples.value = bsRes.data.data ?? []
      } catch {
         organisms.value = []
         biosamples.value = []
      } finally {
         isLoading.value = false
      }
   }

   // D3 Sankey render
   function renderSankey() {
      const el = svgRef.value
      if (!el || graph.value.links.length === 0) return

      // Clear previous render
      d3.select(el).selectAll('*').remove()

      const scrollEl = chartScrollRef.value
      const containerWidth = scrollEl?.clientWidth ?? el.parentElement?.clientWidth ?? 680
      const nodeCount = Math.max(
         graph.value.nodes.filter(n => n.type === 'organism').length,
         graph.value.nodes.filter(n => n.type === 'biosample').length,
      )
      const height = Math.max(200, nodeCount * 36 + 60)
      /** Extra left space for rotated species labels */
      const margin = { top: 16, right: 160, bottom: 16, left: 200 }
      const width = containerWidth
      const innerW = width - margin.left - margin.right
      const innerH = height - margin.top - margin.bottom

      el.setAttribute('width', String(width))
      el.setAttribute('height', String(height))

      const svg = d3.select(el)
         .append('g')
         .attr('transform', `translate(${margin.left},${margin.top})`)

      // Build node/link index maps
      const nodeIndex = new Map<string, number>()
      const sankeyNodes = graph.value.nodes.map((n, i) => {
         nodeIndex.set(n.id, i)
         return { name: n.label, type: n.type, originalId: n.id }
      })
      const sankeyLinks = graph.value.links.map(l => ({
         source: nodeIndex.get(l.source)!,
         target: nodeIndex.get(l.target)!,
         value: l.value,
         meta: l,
      }))

      const sankeyLayout = d3Sankey()
         .nodeWidth(12)
         .nodePadding(10)
         .extent([[0, 0], [innerW, innerH]])

      const { nodes, links } = sankeyLayout({
         nodes: sankeyNodes.map(d => ({ ...d })),
         links: sankeyLinks.map(d => ({ ...d })),
      })

      // Color scales
      const orgColor = 'var(--cms-primary, #2563eb)'
      const bsColor = 'var(--cms-success, #16a34a)'

      // Draw links
      svg.append('g')
         .attr('fill', 'none')
         .selectAll('path')
         .data(links)
         .join('path')
         .attr('d', sankeyLinkHorizontal())
         .attr('stroke', (d: any) => d.source.type === 'organism' ? orgColor : bsColor)
         .attr('stroke-width', (d: any) => Math.max(1.5, d.width))
         .attr('stroke-opacity', 0.35)
         .attr('class', 'sankey-link')

      // Draw nodes
      const nodeGroup = svg.append('g')
         .selectAll('rect')
         .data(nodes)
         .join('rect')
         .attr('x', (d: any) => d.x0)
         .attr('y', (d: any) => d.y0)
         .attr('height', (d: any) => Math.max(2, d.y1 - d.y0))
         .attr('width', (d: any) => d.x1 - d.x0)
         .attr('fill', (d: any) => d.type === 'organism' ? orgColor : bsColor)
         .attr('rx', 3)

      // Left labels (organisms) — slight rotation for long scientific names
      const labelRotateDeg = -26
      svg.append('g')
         .selectAll('text.label-left')
         .data(nodes.filter((d: any) => d.type === 'organism'))
         .join('text')
         .attr('class', 'label-left')
         .attr('x', (d: any) => d.x0 - 8)
         .attr('y', (d: any) => (d.y0 + d.y1) / 2)
         .attr('dy', '0.35em')
         .attr('text-anchor', 'end')
         .attr('font-size', '11px')
         .attr('fill', 'var(--cms-text, #0f172a)')
         .attr('font-style', 'italic')
         .attr('transform', (d: any) => {
            const cx = d.x0 - 8
            const cy = (d.y0 + d.y1) / 2
            return `rotate(${labelRotateDeg} ${cx} ${cy})`
         })
         .text((d: any) => truncate(d.name, 42))

      // Right labels (biosamples)
      svg.append('g')
         .selectAll('text.label-right')
         .data(nodes.filter((d: any) => d.type === 'biosample'))
         .join('text')
         .attr('class', 'label-right')
         .attr('x', (d: any) => d.x1 + 8)
         .attr('y', (d: any) => (d.y0 + d.y1) / 2)
         .attr('dy', '0.35em')
         .attr('text-anchor', 'start')
         .attr('font-size', '11px')
         .attr('fill', 'var(--cms-text, #0f172a)')
         .text((d: any) => truncate(d.name, 28))
   }

   function truncate(str: string, len: number) {
      return str.length > len ? str.slice(0, len - 1) + '…' : str
   }

   watch(graph, async () => {
      await nextTick()
      renderSankey()
   })

   onMounted(async () => {
      await fetchData()
      await nextTick()
      renderSankey()

      if (typeof ResizeObserver !== 'undefined' && chartScrollRef.value) {
         resizeObserver = new ResizeObserver(() => {
            renderSankey()
         })
         resizeObserver.observe(chartScrollRef.value)
      }
   })

   onUnmounted(() => {
      resizeObserver?.disconnect()
      resizeObserver = null
   })
</script>

<style lang="scss" scoped>
   .sankey-module {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
   }

   .sankey-module :deep(.cms-card) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
   }

   .sankey-module :deep(.cms-card__body) {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
   }

   /** Fills remaining card body; tall SVG scrolls vertically (and horizontally if needed) */
   .sankey-module__chart-scroll {
      flex: 1 1 auto;
      min-height: 0;
      max-height: 100%;
      overflow: auto;
      -webkit-overflow-scrolling: touch;
   }

   .sankey-wrap {
      width: 100%;
      min-height: 140px;
   }

   .sankey-svg {
      display: block;
      max-width: 100%;
   }

   :deep(.sankey-link:hover) {
      stroke-opacity: 0.65;
      cursor: default;
   }

   /* Fallback drilldown */
   .sankey-details {
      border-top: 1px solid var(--cms-border);
   }

   .sankey-details__summary {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.8rem;
      font-family: var(--cms-font);
      color: var(--cms-text-muted);
      cursor: pointer;
      list-style: none;
      user-select: none;
      padding: 0.5rem 0;

      &::-webkit-details-marker { display: none; }
   }
</style>
