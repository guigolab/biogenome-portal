<template>
    <div>
    <va-card-actions align="end">
      <va-button size="small" @click="downloadSVGImage(tree)">SVG</va-button>
    </va-card-actions>
      <svg ref="tree" class="tree-svg"></svg>
    </div>
</template>
<script setup lang="ts">
  import { reactive, onMounted, ref, computed } from 'vue'
  import * as d3 from 'd3'
  import { useRouter } from 'vue-router'
  import { Canvg } from 'canvg'
  import {createRadialTree} from './scripts/createRadialTree'
  import {useTreeData} from './setTreeData'
  import {downloadSVGImage} from './scripts/generateImage'

  const props = defineProps({
    data: Object,
  })

  const tree = ref(null)
  const {root, domains} = useTreeData(props.data)

  onMounted(()=>{
    createRadialTree(tree, root, domains)
  })
</script>

<style scoped>
  .leaves-class,
  .legend-text {
    cursor: pointer;
    font-size: 0.8rem;
    /* font-size: inherit; */
  }
  .tree-svg {
    width: inherit;
    height: 100%;
    /* max-width: 100%; */
    overflow: visible;
  }
  .tooltip {
    position: absolute;
    text-align: center;
    width: min-content;
    background: black;
    border: 0px;
    color: white;
    border-radius: 8px;
    min-width: 300px;
  }
</style>
