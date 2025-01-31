<template>
  <div ref="container" class="chromosome-viewer">
    <div class="scrollable-svg">
      <svg ref="svg" :width="svgWidth" :height="svgHeight"></svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as d3 from 'd3';
import { ref, nextTick, watch, computed } from 'vue';
import { ChromosomeInterface } from '../data/types';
import { useColors } from 'vuestic-ui/web-components';

const { colors } = useColors()

const props = defineProps<{
  accession: string;
  selectedChromosomes: ChromosomeInterface[];
  chromosomes: ChromosomeInterface[]
}>();

const emit = defineEmits<{
  (e: 'chromosomeSelected', chromosome: ChromosomeInterface): void;
}>();

const svgWidth = ref(0); // Dynamic width
const container = ref<HTMLDivElement | null>(null);
const svg = ref<SVGSVGElement | null>(null);
const svgHeight = 120; // Fixed height for chromosomes
const chromosomeWidth = 10; // Adjust chromosome width for better visibility
const spacing = 12; // Spacing between chromosomes

const mappedSelection = computed(() => props.selectedChromosomes.map(({ accession_version }) => accession_version))

// Adjust SVG width dynamically based on container size and number of chromosomes
const adjustSvgWidth = async () => {
  await nextTick();
  if (container.value) {
    const containerWidth = container.value.getBoundingClientRect().width;
    console.log(containerWidth)
    svgWidth.value = Math.max(containerWidth, props.chromosomes.length * (chromosomeWidth + spacing));
  }
};

watch(() => props.chromosomes, async () => {
  await adjustSvgWidth();
  renderSVG();
}, { immediate: true })

watch(() => mappedSelection.value, async () => {
  await adjustSvgWidth();
  renderSVG();
})


const getMaxLength = () =>
  props.chromosomes.reduce((max, c) => Math.max(max, c.metadata.length), 0);

const renderSVG = () => {
  if (!svg.value) return;

  const maxLength = getMaxLength();
  const scale = d3.scaleLinear().domain([0, maxLength]).range([10, svgHeight - 20]);

  const svgElement = d3.select(svg.value);
  svgElement.selectAll('*').remove();


  const chromosomeGroups = svgElement
    .selectAll('g.chromosome')
    .data(props.chromosomes)
    .enter()
    .append('g')
    .attr(
      'transform',
      (_, i) => `translate(${i * (chromosomeWidth + spacing) + spacing}, ${svgHeight - 20})`
    );

  chromosomeGroups
    .append('rect')
    .attr('x', 0)
    .attr('y', (d) => -scale(d.metadata.length))
    .attr('width', chromosomeWidth)
    .attr('height', (d) => scale(d.metadata.length))
    .attr('fill', (d) => mappedSelection.value.includes(d.accession_version) ? colors.info : '#6c757d')
    .attr('rx', 3)

  chromosomeGroups
    .append('text')
    .attr('x', chromosomeWidth / 2)
    .attr('y', 15)
    .attr('text-anchor', 'middle')
    .attr('font-size', 8)
    .attr('fill', '#000')
    .text((d) => d.metadata.chr_name);
};
</script>

<style scoped>
.chromosome-viewer {
  position: relative;
  display: block;
  width: 100%;
}

.scrollable-svg {
  overflow-x: auto;
  /* Enable horizontal scrolling */
  overflow-y: hidden;
  white-space: nowrap;
}

svg {
  display: block;
}
</style>
