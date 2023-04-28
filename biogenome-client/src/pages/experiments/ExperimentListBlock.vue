<template>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card class="d-flex">
        <FilterForm :filters="filters" @on-reset="reset" @on-submit="handleSubmit"/>
        <va-card-content> {{ t('table.total') }}: {{ total }} </va-card-content>
        <va-card-content>
          <DataTable :items="experiments" :columns="columns" />
          <div class="row align-center justify-center">
            <div class="flex">
              <va-pagination
                v-model="offset"
                :page-size="readStore.pagination.limit"
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
  import ReadService from '../../services/clients/ReadService'
  import { onMounted, ref, watch } from 'vue'
  import { AxiosResponse } from 'axios'
  import { useReadStore } from '../../stores/read-store'
  import DataTable from '../../components/ui/DataTable.vue'
  import { Filter,ReadSearchForm } from '../../data/types'
  import FilterForm from '../../components/ui/FilterForm.vue'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const readStore = useReadStore()

  const columns = [
    'experiment_accession',
    'experiment_title',
    'scientific_name',
    'instrument_platform',
    'center_name',
    'first_created',
  ]

  const filters = ref<Filter[]> ([
    {
      label: 'experimentList.filters.textInput',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'experimentList.filters.filterBy',
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'experiment_title', 'instrument_platform', 'scientific_name'],
    },
    {
      label: 'experimentList.filters.sortColumn',
      key: 'sort_column',
      type: 'select',
      options: ['first_created'],
    },
    {
      label: 'experimentList.filters.sortOrder',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
    {
      label: 'experimentList.filters.date',
      key: 'date',
      type: 'date',
    },
  ])

  watch(()=>readStore.submitters, ()=>{
    console.log(readStore.submitters)
    filters.value.push({
      label: 'experimentList.filters.sequencingCenters',
      key: 'center',
      type: 'select',
      options: readStore.submitters.map(({name}) => name)
    })
  })
  const offset = ref(1 + readStore.pagination.offset)

  const experiments = ref([])
  const total = ref(0)

  onMounted(async () => {
    getReads(await ReadService.getReads({ ...readStore.searchForm, ...readStore.pagination }))
  })

  async function handleSubmit(payload:ReadSearchForm) {
    readStore.searchForm = {...payload}
    readStore.resetPagination()
    offset.value = 1
    getReads(await ReadService.getReads({ ...readStore.searchForm, ...readStore.pagination }))
  }
  async function handlePagination(value: number) {
    readStore.pagination.offset = value - 1
    getReads(await ReadService.getReads({ ...readStore.searchForm, ...readStore.pagination }))
  }

  async function reset() {
    offset.value = 1
    readStore.resetForm()
    readStore.resetPagination()
    getReads(await ReadService.getReads({ ...readStore.pagination }))
  }

  function getReads({ data }: AxiosResponse) {
    experiments.value = data.data
    total.value = data.total
    return data
  }
</script>
