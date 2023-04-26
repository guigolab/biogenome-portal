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
                    v-model="biosampleStore.searchForm[filter.key]"
                    :label="filter.label"
                  />
                </div>
                <div v-else-if="filter.type === 'select'">
                  <va-select
                    v-model="biosampleStore.searchForm[filter.key]"
                    :label="filter.label"
                    :options="filter.options"
                  />
                </div>
                <div v-else>
                  <va-date-input
                    v-model="dateRange"
                    :format-date="(date:Date) => date.toISOString().substring(0,10)"
                    :label="t('biosampleList.filters.date')"
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
  import { onMounted, ref, watch } from 'vue'
  import { AxiosResponse } from 'axios'
  import { useBioSampleStore } from '../../stores/biosample-store'
  import DataTable from '../../components/ui/DataTable.vue'
  import { Filter } from '../../data/types'
  import { useI18n } from 'vue-i18n'
  const { t } = useI18n()
  
  const biosampleStore = useBioSampleStore()
  const initDateRange = {
    start: null,
    end: null,
  }
  const dateRange = ref({ ...initDateRange })
  watch(dateRange, () => {
    if (dateRange.value.start)
      biosampleStore.searchForm.start_date = new Date(dateRange.value.start).toISOString().split('T')[0]
    if (dateRange.value.end)
      biosampleStore.searchForm.end_date = new Date(dateRange.value.end).toISOString().split('T')[0]
  })
  const filters: Filter[] = [
    {
      label: t('biosampleList.filters.searchInput'),
      key: 'filter',
      type: 'input',
    },
    {
      label: t('biosampleList.filters.searchInput'),
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'gal', 'scientific_name', 'habitat'],
    },
    {
      label: t('biosampleList.filters.sortColumn'),
      key: 'sort_column',
      type: 'select',
      options: ['collection_date'],
    },
    {
      label: t('biosampleList.filters.sortOrder'),
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
    {
      label: t('biosampleList.filters.date'),
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

  async function handleSubmit() {
    biosampleStore.resetPagination()
    offset.value = 1
    getBioSamples(await BioSampleService.getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination }))
  }
  async function handlePagination(value: number) {
    biosampleStore.pagination.offset = value - 1
    getBioSamples(await BioSampleService.getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination }))
  }
  async function reset() {
    const { start, end } = dateRange.value
    if (start || end) dateRange.value = { ...initDateRange }
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
