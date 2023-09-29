<template>
  <va-card class="mb-4">
    <va-card-title>
      {{ t(relatedData.title) }}
    </va-card-title>
      <va-data-table sticky-header height="300px" :items="items" :columns="relatedData.columns">
        <template #cell(accession)="{ rowData }">
          <va-chip size="small" outline :to="{ name: relatedData.route, params: { accession: rowData.accession } }">{{
            rowData.accession
          }}</va-chip>
        </template>
        <template #cell(local_id)="{ rowData }">
          <va-chip size="small" :to="{ name: relatedData.route, params: { id: rowData.local_id } }" outline>{{
            rowData.local_id
          }}</va-chip>
        </template>
        <template #cell(name)="{ rowData }">
          <va-chip v-if="relatedData.key === 'annotations'"
            :to="{ name: relatedData.route, params: { id: rowData.local_id } }" size="small" outline>{{ rowData.name
            }}</va-chip>
          <va-chip v-else="relatedData.key === 'annotations'" size="small" outline>{{ rowData.name }}</va-chip>
        </template>
        <template #cell(experiment_accession)="{ rowData }">
          <va-chip :to="{ name: relatedData.route, params: { accession: rowData.experiment_accession } }" size="small"
            outline>{{
              rowData.experiment_accession
            }}</va-chip>
        </template>
        <template #cell(organism_part)="{ rowData }">
          {{ rowData.metadata.tissue || rowData.metadata.organism_part || rowData.metadata['organism part'] }}
        </template>
        <template #cell(assembly_level)="{ rowData }">
          {{ rowData.metadata.assembly_level }}
        </template>
      </va-data-table>
  </va-card>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import OrganismService from '../../services/clients/OrganismService'
import BioSampleService from '../../services/clients/BioSampleService'

const { t } = useI18n()

const callbackObj = {
  'organism': OrganismService.getOrganismRelatedData,
  'biosample': BioSampleService.getBioSampleRelatedData
}
const props = defineProps<{
  relatedData: Record<string, any>
  objectId: string
  callback: 'organism' | 'biosample'
}>()
const items = ref<Record<string, any>[]>([])

const { data } = await callbackObj[props.callback](props.objectId, props.relatedData.key)
items.value = [...data]

</script>

<style scoped lang="scss">
.row-equal .flex {
  .va-card {
    height: 100%;
  }
}

.va-card {
  margin-bottom: 0 !important;

  &__title {
    display: flex;
    justify-content: space-between;
  }
}

.list__item+.list__item {
  margin-top: 10px;
}
</style>
