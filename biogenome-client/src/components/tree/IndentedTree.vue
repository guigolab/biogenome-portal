<template>
  <div>
    <svg ref="tree"></svg>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { useTreeData } from './setTreeData'
import { createIndentedTree } from './scripts/createIndentedTree'
import { useRouter } from 'vue-router'
import { TaxonNode } from '../../data/types'
const router = useRouter()
const tree = ref(null)

const props = defineProps<{
  data: TaxonNode
}>()

const { root } = useTreeData(props.data)

onMounted(() => {
  createIndentedTree(tree, root, router)
})
</script>
