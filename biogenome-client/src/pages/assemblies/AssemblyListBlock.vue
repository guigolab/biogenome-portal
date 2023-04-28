<template>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card class="d-flex">
        <FilterForm :filters="filters" @on-submit="handleSubmit" @on-reset="reset"/>
        <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
        <va-card-content>
          <DataTable :items="assemblies" :columns="columns" />
          <div class="row align-center justify-center">
            <div class="flex">
              <va-pagination
                v-model="offset"
                :page-size="assemblyStore.pagination.limit"
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
  import { useAssemblyStore } from '../../stores/assembly-store'
  import AssemblyService from '../../services/clients/AssemblyService'
  import { onMounted, ref, watch } from 'vue'
  import { AxiosResponse } from 'axios'
  import DataTable from '../../components/ui/DataTable.vue'
  import { AssemblySearchForm, Filter } from '../../data/types'
  import { useI18n } from 'vue-i18n'
  import FilterForm from '../../components/ui/FilterForm.vue'

  const { t } = useI18n()

  const assemblyStore = useAssemblyStore()
  watch(()=>assemblyStore.submitters, ()=>{
    filters.value.push({
      label: 'assemblyList.charts.contributorList.title',
      key: 'submitter',
      type: 'select',
      options: assemblyStore.submitters.map(({name}) => name)
    })
  })
  const filters  = ref<Filter[]>([
    {
      label: 'assemblyList.filters.searchInput',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'assemblyList.filters.searchSelect',
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'assembly_name', 'scientific_name'],
    },
    {
      label: 'assemblyList.filters.assemblyLevel',
      key: 'assembly_level',
      type: 'select',
      options: ['Chromosome', 'Complete Genome', 'Contig', 'Scaffold'],
    },
    {
      label: 'assemblyList.filters.sortColumn',
      key: 'sort_column',
      type: 'select',
      options: ['contig_n50', 'size', 'submission_date'],
    },
    {
      label: 'assemblyList.filters.sortOrder',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
    {
      label: 'assemblyList.filters.date',
      key: 'date',
      type: 'date',
    },
  ])

  
  const offset = ref(1 + assemblyStore.pagination.offset)

  const columns = [
    'assembly_name',
    'scientific_name',
    'assembly_level',
    'contig_n50',
    'submitter',
    'submission_date',
    'size',
    'chromosomes',
  ]
  const assemblies = ref([])
  const total = ref(0)

  onMounted(async () => {
    getAssemblies(await AssemblyService.getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination }))
  })

  async function handleSubmit(payload:AssemblySearchForm) {
    assemblyStore.searchForm = {...payload}
    assemblyStore.resetPagination()
    offset.value = 1
    getAssemblies(await AssemblyService.getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination }))
  }
  async function handlePagination(value: number) {
    assemblyStore.pagination.offset = value - 1
    getAssemblies(await AssemblyService.getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination }))
  }
  async function reset() {
    offset.value = 1
    assemblyStore.resetForm()
    assemblyStore.resetPagination()
    getAssemblies(await AssemblyService.getAssemblies({ ...assemblyStore.pagination }))
  }

  function getAssemblies({ data }: AxiosResponse) {
    assemblies.value = data.data
    total.value = data.total
    return data
  }
</script>

<style lang="scss">
  .chart {
    height: 400px;
  }
  .row-equal .flex {
    .va-card {
      height: 100%;
    }
  }
</style>
