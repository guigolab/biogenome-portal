<template>
  <va-card class="mb-4">
    <va-tabs v-model="selectedData" grow>
      <template #tabs>
        <va-tab v-for="model in relatedData" :key="model.key" :name="model.key">
          {{ t(model.title) }}
        </va-tab>
      </template>
    </va-tabs>
    <va-card-content>
      <va-data-table sticky-header height="300px" :items="items" :columns="selectedModel.columns">
        <template #cell(accession)="{ rowData }">
          <va-chip size="small" outline :to="{ name: selectedModel.route, params: { accession: rowData.accession } }">{{
            rowData.accession
          }}</va-chip>
        </template>
        <template #cell(local_id)="{ rowData }">
          <va-chip size="small" :to="{name: 'local_sample', params: {id:rowData.local_id}}" outline>{{ rowData.local_id }}</va-chip>
        </template>
        <template #cell(name)="{ rowData }">
          <va-chip size="small" outline>{{ rowData.name }}</va-chip>
        </template>
        <template #cell(experiment_accession)="{ rowData }">
          <va-chip :to="{ name: 'experiment', params: { accession: rowData.experiment_accession } }" size="small" outline>{{
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
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
  import { watch, ref } from 'vue'
  import { useI18n } from 'vue-i18n'
    
  const { t } = useI18n()

  const props = defineProps({
    relatedData: Array,
    request: Function,
    id: String,
  })

  const selectedData = ref(props.relatedData[0].key)
  const selectedModel = ref({ ...props.relatedData[0] })
  const items = ref((await props.request(props.id, selectedData.value)).data)

  watch(selectedData, async () => {
    const { data } = await props.request(props.id, selectedData.value)
    items.value = [...data]
    selectedModel.value = { ...props.relatedData.find((dt) => dt.key === selectedData.value) }
  })
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

  .list__item + .list__item {
    margin-top: 10px;
  }
</style>
