<template>
  <div>
    <va-tree-view
      :nodes="nodes"
      :expanded="expandedNodes"
      :track-by="trackBy"
      :value-by="trackBy"
      @update:expanded="(value)=>$emit('update:expanded',value)"
    >
      <template #content="node">
        <div class="row align-center ">
          <div class="flex">
            <b class="display-6">{{ node.name || node.title }}</b>
            <p class="text--secondary mb-0">{{ node.rank || node.accession }}</p>
          </div>
          <div v-if="node.accession || node.taxid" class="flex">
            <va-button :to="node.accession ? {name:'bioproject', params: {accession:node.accession} }:{name:'taxon', params:{taxid:node.taxid}}" preset="secondary" icon="open_in_new" style="float: inline-end;" />
          </div>
        </div>
      </template>
    </va-tree-view>
  </div>
</template>
<script setup lang="ts">
  interface INode {
    name?: string
    taxid?: string
    accession?: string
    title?: string
    rank?: string
    leaves: number
  }

  interface IProps {
    nodes: INode[]
    expandedNodes: Array<string>
    trackBy: string
  }

  const props = defineProps<IProps>()

  const emit = defineEmits<{
    (e: 'update:expanded', value: Array<string>): void
  }>()
</script>
