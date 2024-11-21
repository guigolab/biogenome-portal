<template>
    <div class="chromosome-viewer">
      <div
        v-for="chromosome in chromosomeLengths"
        :key="chromosome.name"
        class="chromosome-bar"
        :style="{ width: getWidth(chromosome.length) + '%', backgroundColor: hoveredChromosome === chromosome.name ? '#3b82f6' : '#93c5fd' }"
        @mouseover="hoveredChromosome = chromosome.name"
        @mouseleave="hoveredChromosome = ''"
      >
        <span class="chromosome-name">{{ chromosome.name }}</span>
      </div>
    </div>
  </template>
  
  <script lang="ts">
  import { defineComponent, ref, PropType } from 'vue';
  
  interface Chromosome {
    name: string;
    length: number;
  }
  
  export default defineComponent({
    name: 'ChromosomeViewer',
    props: {
      chromosomeLengths: {
        type: Array as PropType<Chromosome[]>,
        required: true,
      },
    },
    setup(props) {
      const maxLength = Math.max(...props.chromosomeLengths.map(chromosome => chromosome.length));
      const hoveredChromosome = ref<string>('');
  
      const getWidth = (length: number) => {
        return (length / maxLength) * 100; // Get proportional width in percentage
      };
  
      return {
        hoveredChromosome,
        getWidth,
      };
    },
  });
  </script>
  
  <style scoped>
  .chromosome-viewer {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin: 20px;
  }
  
  .chromosome-bar {
    display: flex;
    align-items: center;
    height: 30px;
    padding: 5px;
    color: #fff;
    transition: background-color 0.3s;
    border-radius: 4px;
  }
  
  .chromosome-name {
    margin-left: 10px;
    font-weight: bold;
  }
  </style>
  