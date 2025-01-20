<template>
  <div>
    <svg ref="tree"></svg>
  </div>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createRadialTree } from './scripts/createRadialTree'
import { useTreeData } from './setTreeData'

const props = defineProps({
  data: Object,
})

const tree = ref(null)
const { root, domains } = useTreeData(props.data)

onMounted(() => {
  createRadialTree(tree, root, domains)
})
</script>

<style scoped>
.leaves-class,
.legend-text {
  cursor: pointer;
  font-size: inherit;
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
