<template>
  <div class="row row-equal">
    <div class="flex lg3 md3 sm12 xs12">
      <va-card>
        <va-card-title> filters </va-card-title>
        <va-form tag="form" @submit.prevent="handleSubmit">
          <va-card-content>
            <div class="row align-center justify-start">
              <div v-for="(filter, index) in filters" :key="index" class="flex lg12 md12 sm12 xs12">
                <div v-if="filter.type === 'input'">
                  <va-input v-model="searchForm[filter.key]" :label="filter.label" :placeholder="filter.placeholder" />
                </div>
                <div v-else>
                  <va-select v-model="searchForm[filter.key]" :label="filter.label" :options="filter.options" />
                </div>
              </div>
            </div>
          </va-card-content>
          <va-card-actions align="between">
            <va-button type="submit">Search</va-button>
            <va-button color="danger" @click="reset()">Reset</va-button>
          </va-card-actions>
        </va-form>
      </va-card>
    </div>
    <div class="flex lg9 md9 sm12 xs12">
      <va-card class="d-flex">
        <va-card-content> Total: {{ total }} </va-card-content>
        <va-card-content>
          <DataTable :items="bioprojects" :columns="columns" />
          <div class="row align-center justify-center">
            <div class="flex">
              <va-pagination
                v-model="offset"
                :page-size="pagination.limit"
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
  import { onMounted, ref } from 'vue'
  import { AxiosResponse } from 'axios'
  import DataTable from '../../components/ui/DataTable.vue'
  import { Filter } from '../../data/types'
  import BioProjectService from '../../services/clients/BioProjectService'

  const initPagination = {
    offset: 0,
    limit: 10,
  }
  const initSearchForm = {
    filter: '',
    sort_column: '',
    sort_order: '',
  }

  const offset = ref(1)
  const total = ref(0)

  const searchForm = ref({ ...initSearchForm })
  const pagination = ref({ ...initPagination })
  const columns = ['title', 'accession', 'organisms']

  const filters: Filter[] = [
    {
      label: 'search Bioproject',
      placeholder: 'Search by name or accession',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'sort_column',
      key: 'sort_column',
      type: 'select',
      options: ['leaves'],
    },
    {
      label: 'sort_order',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
  ]

  const bioprojects = ref([])

  onMounted(async () => {
    getBioProjects(await BioProjectService.getBioprojects({ ...searchForm.value, ...pagination.value }))
  })

  async function handleSubmit() {
    offset.value = 1
    pagination.value = { ...initPagination }
    getBioProjects(await BioProjectService.getBioprojects({ ...searchForm.value, ...pagination.value }))
  }
  async function handlePagination(value: number) {
    pagination.value.offset = value - 1
    getBioProjects(await BioProjectService.getBioprojects({ ...searchForm.value, ...pagination.value }))
  }
  async function reset() {
    offset.value = 1
    searchForm.value = { ...initSearchForm }
    pagination.value = { ...initPagination }
    getBioProjects(await BioProjectService.getBioprojects({ ...searchForm.value, ...pagination.value }))
  }

  function getBioProjects({ data }: AxiosResponse) {
    bioprojects.value = data.data
    total.value = data.total
    return data
  }
</script>
