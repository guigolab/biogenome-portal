<template>
  <div>
    <va-card-content>
      <va-chip size="small" color="warning"> Number of organisms </va-chip>
    </va-card-content>
    <va-tree-view
      :nodes="nodes"
      :expanded="expandedNodes"
      :track-by="trackBy"
      :value-by="trackBy"
      @update:expanded="(value:Array<String>)=>$emit('update:expanded',value)"
    >
      <template #content="node">
        <div class="d-flex align-center">
          <div style="margin-right: 0.5rem">
            <b class="display-6">{{ node.name || node.title }}</b>
            <p class="text--secondary mb-0">{{ node.rank || node.accession }}</p>
          </div>
          <va-chip v-if="node.leaves" color="warning" size="small">{{ node.leaves }}</va-chip>
          <va-button preset="secondary" icon="open_in_new" style="margin-left: auto" />
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
