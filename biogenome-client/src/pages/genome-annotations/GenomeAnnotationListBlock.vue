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
                      v-model="annotationStore.searchForm[filter.key]"
                      :label="filter.label"
                    />
                  </div>
                  <div v-else-if="filter.type === 'select'">
                    <va-select
                      v-model="annotationStore.searchForm[filter.key]"
                      :label="filter.label"
                      :options="filter.options"
                    />
                  </div>
                  <div v-else>
                    <va-date-input
                      v-model="dateRange"
                      :format-date="(date:Date) => date.toISOString().substring(0,10)"
                      label="Date"
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
            <DataTable :items="annotations" :columns="columns" />
            <div class="row align-center justify-center">
              <div class="flex">
                <va-pagination
                  v-model="offset"
                  :page-size="annotationStore.pagination.limit"
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
    import { useAnnotationStore } from '../../stores/annotation-store'
    import AnnotationService from '../../services/clients/AnnotationService'
    import { useI18n } from 'vue-i18n'
    
    const { t } = useI18n()

    const annotationStore = useAnnotationStore()

    const initDateRange = {
      start: null,
      end: null,
    }
  const dateRange = ref({ ...initDateRange })
  watch(dateRange, () => {
    if (dateRange.value.start)
    annotationStore.searchForm.start_date = new Date(dateRange.value.start).toISOString().split('T')[0]
    if (dateRange.value.end) annotationStore.searchForm.end_date = new Date(dateRange.value.end).toISOString().split('T')[0]
  })
    const filters: Filter[] = [
      {
        label: 'search annotation',
        placeholder: 'Search by name, assembly_name, scientific_name',
        key: 'filter',
        type: 'input',
      },
      {
        label: 'filter by',
        key: 'filter_option',
        type: 'select',
        options: ['name', 'assembly_name','scientific_name'],
      },
      {
        label: 'sort_column',
        key: 'sort_column',
        type: 'select',
        options: ['created'],
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
  
    const offset = ref(1 + annotationStore.pagination.offset)
  
    const columns = ['annotation_name', 'related_assembly','scientific_name', 'taxid', 'created','gff_gz_location', 'tab_index_location']
  
    const annotations = ref([])
    const total = ref(0)
  
    onMounted(async () => {
      getAnnotations(await AnnotationService.getAnnotations({ ...annotationStore.searchForm, ...annotationStore.pagination }))
    })
  
    async function handleSubmit() {
      annotationStore.resetPagination()
      offset.value = 1
      getAnnotations(await AnnotationService.getAnnotations({ ...annotationStore.searchForm, ...annotationStore.pagination }))
    }
    async function handlePagination(value: number) {
      annotationStore.pagination.offset = value - 1
      getAnnotations(await AnnotationService.getAnnotations({ ...annotationStore.searchForm, ...annotationStore.pagination }))
    }
  
    async function reset() {
      const { start, end } = dateRange.value
      if (start || end) dateRange.value = { ...initDateRange }
      offset.value = 1
      annotationStore.resetForm()
      annotationStore.resetPagination()
      getAnnotations(await AnnotationService.getAnnotations({ ...annotationStore.pagination }))
    }
  
    function getAnnotations({ data }: AxiosResponse) {
      annotations.value = data.data
      total.value = data.total
      return data
    }
  </script>
  