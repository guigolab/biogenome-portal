<template>
   <div ref="container" class="chromosome-viewer">
      <svg ref="svg" class="chromosome-viewer__svg" :width="svgWidth" :height="svgHeight" />
   </div>
</template>

<script setup lang="ts">
   import * as d3 from 'd3'
   import { ref, nextTick, watch, computed, onMounted, onUnmounted } from 'vue'
   import { ChromosomeInterface } from '../data/types'
   import { useColors } from 'vuestic-ui/web-components'

   const { colors } = useColors()

   const props = defineProps<{
      accession: string
      selectedChromosomes: ChromosomeInterface[]
      chromosomes: ChromosomeInterface[]
   }>()

   const emit = defineEmits<{
      (e: 'chromosomeSelected', chromosome: ChromosomeInterface): void
   }>()

   const container = ref<HTMLDivElement | null>(null)
   const svg = ref<SVGSVGElement | null>(null)
   const containerWidth = ref(0)

   // Grid layout: columns fit container width, rows wrap — keep original bar size & spacing
   const chromosomeWidth = 10
   const spacing = 12
   const rowHeight = 120
   const barScaleMin = 10
   const barScaleMax = 100 // rowHeight - 20 (original)

   const mappedSelection = computed(() =>
      props.selectedChromosomes.map(({ accession_version }) => accession_version),
   )

   const gridLayout = computed(() => {
      const count = props.chromosomes.length
      const width = containerWidth.value
      const slotWidth = chromosomeWidth + spacing
      if (count === 0) return { cols: 1, rows: 0, width: slotWidth + spacing, height: rowHeight }
      const cols = Math.max(1, Math.floor((width + spacing) / slotWidth))
      const rows = Math.ceil(count / cols)
      return {
         cols,
         rows,
         width: cols * slotWidth + spacing,
         height: rows * rowHeight,
         slotWidth,
         slotHeight: rowHeight,
      }
   })

   function updateContainerWidth() {
      if (container.value) containerWidth.value = container.value.getBoundingClientRect().width
   }

   let resizeObserver: ResizeObserver | null = null
   onMounted(() => {
      nextTick(() => {
         updateContainerWidth()
         resizeObserver = new ResizeObserver(() => updateContainerWidth())
         if (container.value) resizeObserver.observe(container.value)
      })
   })

   onUnmounted(() => {
      if (resizeObserver && container.value) resizeObserver.unobserve(container.value)
   })

   const svgWidth = computed(() => gridLayout.value.width)
   const svgHeight = computed(() => gridLayout.value.height)

   async function measureAndRender() {
      await nextTick()
      renderSVG()
   }

   watch(
      () => [props.chromosomes, gridLayout.value],
      () => measureAndRender(),
      { immediate: true },
   )

   watch(
      () => mappedSelection.value,
      () => renderSVG(),
   )

   const getMaxLength = () =>
      props.chromosomes.reduce((max, c) => Math.max(max, c.metadata.length), 0)

   function renderSVG() {
      if (!svg.value || !props.chromosomes.length) return

      const { cols, slotWidth, slotHeight } = gridLayout.value
      const maxLength = getMaxLength()
      const scale = d3
         .scaleLinear()
         .domain([0, maxLength || 1])
         .range([barScaleMin, barScaleMax])

      const svgElement = d3.select(svg.value)
      svgElement.selectAll('*').remove()

      const barY = rowHeight - 20
      const chromosomeGroups = svgElement
         .selectAll('g.chromosome')
         .data(props.chromosomes)
         .enter()
         .append('g')
         .attr('class', 'chromosome')
         .attr(
            'transform',
            (_, i) =>
               `translate(${(i % cols) * slotWidth + spacing}, ${Math.floor(i / cols) * slotHeight + barY})`,
         )

      chromosomeGroups
         .append('rect')
         .attr('x', 0)
         .attr('y', (d) => -scale(d.metadata.length))
         .attr('width', chromosomeWidth)
         .attr('height', (d) => scale(d.metadata.length))
         .attr('fill', (d) =>
            mappedSelection.value.includes(d.accession_version) ? colors.info : '#6c757d',
         )
         .attr('rx', 3)

      chromosomeGroups
         .append('text')
         .attr('x', chromosomeWidth / 2)
         .attr('y', 15)
         .attr('text-anchor', 'middle')
         .attr('font-size', 8)
         .attr('fill', '#000')
         .text((d) => d.metadata.chr_name ?? d.accession_version ?? '')
   }
</script>

<style lang="scss" scoped>
   .chromosome-viewer {
      position: relative;
      width: 100%;
      min-height: 80px;
      padding: 1.25rem 1rem;
   }

   .chromosome-viewer__svg {
      display: block;
      max-width: 100%;
   }
</style>
