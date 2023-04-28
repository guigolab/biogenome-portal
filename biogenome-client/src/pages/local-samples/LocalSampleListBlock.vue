<template>
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-card class="d-flex">
          <va-form tag="form" @submit.prevent="handleSubmit">
            <va-card-content>
              <div class="row align-center justify-start">
                <div v-for="(filter, index) in filters" :key="index" class="flex lg3 md4 sm12 xs12">
                  <div v-if="filter.type === 'input'">
                    <va-input
                      v-model="localSampleStore.searchForm[filter.key]"
                      :label="t(filter.label)"
                    />
                  </div>
                  <div v-else-if="filter.type === 'select'">
                    <va-select
                      v-model="localSampleStore.searchForm[filter.key]"
                      :label="t(filter.label)"
                      :options="filter.options"
                    />
                  </div>
                  <div v-else>
                    <va-date-input
                      v-model="dateRange"
                      :format-date="(date:Date) => date.toISOString().substring(0,10)"
                      :label="t('localSampleList.filters.date')"
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
              <va-button type="submit">{{t('buttons.submit')}}</va-button>
              <va-button color="danger" @click="reset()">{{t('buttons.reset')}}</va-button>
            </va-card-actions>
          </va-form>
          <va-card-content> {{t('table.total')}}: {{ total }} </va-card-content>
          <va-card-content>
            <DataTable :items="localSamples" :columns="columns" />
            <div class="row align-center justify-center">
              <div class="flex">
                <va-pagination
                  v-model="offset"
                  :page-size="localSampleStore.pagination.limit"
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
    import { onMounted, ref,watch } from 'vue'
    import { AxiosResponse } from 'axios'
    import DataTable from '../../components/ui/DataTable.vue'
    import { Filter } from '../../data/types'
    import { useLocalSampleStore } from '../../stores/local-sample-store'
    import LocalSampleService from '../../services/clients/LocalSampleService'
    import { useI18n } from 'vue-i18n'
      
    const { t } = useI18n()
    const localSampleStore = useLocalSampleStore()
    const initDateRange = {
      start: null,
      end: null,
    }
  const dateRange = ref({ ...initDateRange })
  watch(dateRange, () => {
    if (dateRange.value.start)
    localSampleStore.searchForm.start_date = new Date(dateRange.value.start).toISOString().split('T')[0]
    if (dateRange.value.end) localSampleStore.searchForm.end_date = new Date(dateRange.value.end).toISOString().split('T')[0]
  })
    const filters: Filter[] = [
      {
        label: 'localSampleList.filters.searchInput',
        key: 'filter',
        type: 'input',
      },
      {
        label: 'localSampleList.filters.filterBy',
        key: 'filter_option',
        type: 'select',
        options: ['taxid', 'scientific_name'],
      },
      {
        label: 'localSampleList.filters.sortColumn',
        key: 'sort_column',
        type: 'select',
        options: ['created'],
      },
      {
        label: 'localSampleList.filters.sortOrder',
        key: 'sort_order',
        type: 'select',
        options: ['asc', 'desc'],
      },
      {
        label: 'localSampleList.filters.date',
        key: 'date',
        type: 'date',
      },
    ]
  
    const offset = ref(1 + localSampleStore.pagination.offset)
  
    const columns = ['local_id', 'scientific_name', 'taxid', 'created']
  
    const localSamples = ref([])
    const total = ref(0)
  
    onMounted(async () => {
      getLocalSamples(await LocalSampleService.getLocalSamples({ ...localSampleStore.searchForm, ...localSampleStore.pagination }))
    })
  
    async function handleSubmit() {
      localSampleStore.resetPagination()
      offset.value = 1
      getLocalSamples(await LocalSampleService.getLocalSamples({ ...localSampleStore.searchForm, ...localSampleStore.pagination }))
    }
    async function handlePagination(value: number) {
      localSampleStore.pagination.offset = value - 1
      getLocalSamples(await LocalSampleService.getLocalSamples({ ...localSampleStore.searchForm, ...localSampleStore.pagination }))
    }
  
    async function reset() {
      const { start, end } = dateRange.value
      if (start || end) dateRange.value = { ...initDateRange }
      offset.value = 1
      localSampleStore.resetForm()
      localSampleStore.resetPagination()
      getLocalSamples(await LocalSampleService.getLocalSamples({ ...localSampleStore.pagination }))
    }
  
    function getLocalSamples({ data }: AxiosResponse) {
      localSamples.value = data.data
      total.value = data.total
      return data
    }
  </script>
  