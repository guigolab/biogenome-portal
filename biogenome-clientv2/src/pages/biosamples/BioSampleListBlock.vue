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
                    :placeholder="filter.placeholder"
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
                    label="Date"
                    placeholder="select a date range"
                    style="width: 100%"
                    mode="range"
                    type="month"
                    prevent-overflow
                    :allowed-months="(date:Date) => date <= new Date()"
                    :allowed-years="(date:Date) => date <= new Date()"
                  />
                </div>
              </div>
            </div>
          </va-card-content>
          <va-card-actions align="between">
            <va-button type="submit">Search</va-button>
            <va-button color="danger" @click="reset()">Reset</va-button>
          </va-card-actions>
        </va-form>
        <va-card-content> Total: {{ total }} </va-card-content>
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
  import { Filter } from '../../data/types'

  const biosampleStore = useBioSampleStore()

  const filters: Filter[] = [
    {
      label: 'search biosample',
      placeholder: 'Search by species, taxid, gal or habitat',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'filter by',
      key: 'filter_option',
      type: 'select',
      options: ['taxid', 'gal', 'scientific_name', 'habitat'],
    },
    {
      label: 'sort_column',
      key: 'sort_column',
      type: 'select',
      options: ['collection_date'],
    },
    {
      label: 'sort_order',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
    {
      label: 'Date',
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

  function handleDate(payload: Record<string, any>) {
    biosampleStore.searchForm = { ...biosampleStore.searchForm, ...payload }
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
