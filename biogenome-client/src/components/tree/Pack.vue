<template>
  <div ref="wrapper">
    <svg ref="pack">
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useTreeData } from './setTreeData'
import { createPack } from './scripts/createPack'

const pack = ref()
const wrapper = ref()

const props = defineProps<{
  data: Object
}>()

const { root, domains } = useTreeData(props.data)

onMounted(() => {

  createPack(pack, wrapper, root, domains)

})


</script>
<style scoped></style>