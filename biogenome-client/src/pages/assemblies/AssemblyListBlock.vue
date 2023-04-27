<template>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card class="d-flex">
        <va-form tag="form" @submit.prevent="handleSubmit">
          <va-card-content>
            <div class="row align-center justify-start">
              <div v-if="assemblyStore.submitters.length" class="flex lg3 md4 sm12 xs12">
                <va-select
                  v-model="assemblyStore.searchForm.submitter"
                  :options="assemblyStore.submitters"
                  :label="t('assemblyList.filters.submitterSelect')"
                  value-by="name"
                  text-by="name"
                  searchable
                ></va-select>
              </div>
              <div v-for="(filter, index) in filters" :key="index" class="flex lg3 md4 sm12 xs12">
                <div v-if="filter.type === 'input'">
                  <va-input
                    v-model="assemblyStore.searchForm[filter.key]"
                    :label="filter.label"
                  />
                </div>
                <div v-else-if="filter.type === 'select'">
                  <va-select
                    v-model="assemblyStore.searchForm[filter.key]"
                    :label="filter.label"
                    :options="filter.options"
                  />
                </div>
                <div v-else>
                  <va-date-input
                    v-model="dateRange"
                    :format-date="(date:Date) => date.toISOString().substring(0,10)"
                    :label="t('assemblyList.filters.dateRangeSelect.label')"
                    :placeholder="t('assemblyList.filters.dateRangeSelect.placeholder')"
                    style="width: 100%"
                    mode="range"
                    type="month"
                    prevent-overflow
                    :allowed-months="(date:Date) => date.getMonth() <= new Date().getMonth()+1"
                    :allowed-years="(date:Date) => date <= new Date()"
                  />
                </div>
              </div>
            </div>
          </va-card-content>
          <va-card-actions align="between">
            <va-button type="submit">{{ t('buttons.submit') }}</va-button>
            <va-button color="danger" @click="reset()">{{t('buttons.reset')}}</va-button>
          </va-card-actions>
        </va-form>
        <va-card-content> {{ t('table.total') }}: {{ total }} </va-card-content>
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
  import { Filter } from '../../data/types'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()

  const initDateRange = {
    start: null,
    end: null,
  }
  const dateRange = ref({ ...initDateRange })

  watch(dateRange, () => {
    if (dateRange.value.start)
      assemblyStore.searchForm.start_date = new Date(dateRange.value.start).toISOString().split('T')[0]
    if (dateRange.value.end)
      assemblyStore.searchForm.end_date = new Date(dateRange.value.end).toISOString().split('T')[0]
  })

  const assemblyStore = useAssemblyStore()

  const filters: Filter[] = [
    {
      label: t('assemblyList.filters.searchInput'),
      key: 'filter',
      type: 'input',
    },
    {
      label: t('assemblyList.filters.searchSelect'),
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'assembly_name', 'scientific_name'],
    },
    {
      label: t('assemblyList.filters.assemblyLevel'),
      key: 'assembly_level',
      type: 'select',
      options: ['Chromosome', 'Complete Genome', 'Contig', 'Scaffold'],
    },
    {
      label: t('assemblyList.filters.sortColumn'),
      key: 'sort_column',
      type: 'select',
      options: ['contig_n50', 'size', 'submission_date'],
    },
    {
      label: t('assemblyList.filters.sortOrder'),
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
    {
      label: t('assemblyList.filters.date'),
      key: 'date',
      type: 'date',
    },
  ]

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

  async function handleSubmit() {
    assemblyStore.resetPagination()
    offset.value = 1
    getAssemblies(await AssemblyService.getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination }))
  }
  async function handlePagination(value: number) {
    assemblyStore.pagination.offset = value - 1
    getAssemblies(await AssemblyService.getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination }))
  }
  async function reset() {
    const { start, end } = dateRange.value
    if (start || end) dateRange.value = { ...initDateRange }
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
