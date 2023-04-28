<template>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card class="d-flex">
        <FilterForm :filters="filters" @on-submit="handleSubmit" @on-reset="reset"/>
        <va-card-content> {{t('table.total')}} {{ total }} </va-card-content>
        <va-card-content>
          <DataTable :items="biosamples" :columns="columns" />
          <div class="row align-center justify-center">
            <div class="flex">
              <va-pagination
                v-model="offset"
                :page-size="biosampleStore.pagination.limit"
                :total="total"
                :visible-pages="3"
                buttons-preset="secondary"
                rounded
                gapped
                border-color="primary"
                @update:model-value="handlePagination"
              />
            </div>
          </div>
        </va-card-content>
      </va-card>
    </div>
  </div>
</template>
<script setup lang="ts">
  import BioSampleService from '../../services/clients/BioSampleService'
  import { onMounted, ref } from 'vue'
  import { AxiosResponse } from 'axios'
  import { useBioSampleStore } from '../../stores/biosample-store'
  import DataTable from '../../components/ui/DataTable.vue'
  import { BioSampleSearchForm, Filter } from '../../data/types'
  import { useI18n } from 'vue-i18n'
  import FilterForm from '../../components/ui/FilterForm.vue'

  const { t } = useI18n()
  const biosampleStore = useBioSampleStore()

  const filters: Filter[] = [
    {
      label: 'biosampleList.filters.searchInput',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'biosampleList.filters.searchSelect',
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'gal', 'scientific_name', 'habitat'],
    },
    {
      label: 'biosampleList.filters.sortColumn',
      key: 'sort_column',
      type: 'select',
      options: ['collection_date'],
    },
    {
      label: 'biosampleList.filters.sortOrder',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
    {
      label: 'biosampleList.filters.date',
      key: 'date',
      type: 'date',
    },
  ]

  const offset = ref(1 + biosampleStore.pagination.offset)

  const columns = ['accession', 'scientific_name', 'collection_date', 'gal', 'habitat', 'organism_part']

  const biosamples = ref([])
  const total = ref(0)

  onMounted(async () => {
    getBioSamples(await BioSampleService.getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination }))
  })

  async function handleSubmit(payload:BioSampleSearchForm) {
    biosampleStore.searchForm = {...payload}
    biosampleStore.resetPagination()
    offset.value = 1
    getBioSamples(await BioSampleService.getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination }))
  }

  async function handlePagination(value: number) {
    biosampleStore.pagination.offset = value - 1
    getBioSamples(await BioSampleService.getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination }))
  }
  async function reset() {
    offset.value = 1
    biosampleStore.resetForm()
    biosampleStore.resetPagination()
    getBioSamples(await BioSampleService.getBioSamples({ ...biosampleStore.pagination }))
  }

  function getBioSamples({ data }: AxiosResponse) {
    biosamples.value = data.data
    total.value = data.total
    return data
  }
</script>
