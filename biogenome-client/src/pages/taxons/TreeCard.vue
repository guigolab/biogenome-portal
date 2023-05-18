<template>
  <va-card class="fill-height">
    <va-tabs v-model="treeType" grow>
      <template #tabs>
        <va-tab v-for="tab in types" :key="tab.value" :name="tab.value">
          {{ t(tab.label) }}
        </va-tab>
      </template>
    </va-tabs>
    <va-card-content style="height: 500px; overflow: scroll">
      <div v-if="treeType === 'radial'">
        <TreeOfLife :data="data" />
      </div>
      <div v-else>
        <IndentedTree :data="data" />
      </div>
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
import IndentedTree from '../../components/tree/IndentedTree.vue'
import TreeOfLife from '../../components/tree/TreeOfLife.vue'
import TaxonService from '../../services/clients/TaxonService'
import { useI18n } from 'vue-i18n'
import { computed, ref } from 'vue'

const { t } = useI18n()

const props = defineProps<{
  taxid: string
}>()

const treeType = ref('indented')

const { data } = await TaxonService.getTree(props.taxid)
const types = computed(() => {
  if (data && (data.leaves >= 200 || data.leaves === 1)) {
    return [{ value: 'indented', label: 'taxonDetails.indented' }]
  }
  return [
    { value: 'indented', label: 'taxonDetails.indented' },
    { value: 'radial', label: 'taxonDetails.radial' },
  ]
})
</script>