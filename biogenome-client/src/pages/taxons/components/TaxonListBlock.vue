<template>
  <va-card :stripe="Boolean(errorMessage)" stripe-color="danger">
    <FilterForm :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
    <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
    <va-skeleton v-if="isLoading" height="400px" />
    <va-card-content v-else-if="errorMessage">
      {{ errorMessage }}
    </va-card-content>
    <va-card-content v-else>
      <DataTable :items="taxons" :columns="tableColumns" />
      <div class="row align-center justify-center">
        <div class="flex">
          <va-pagination v-model="offset" :page-size="TaxonomyStore.pagination.limit" :total="total" :visible-pages="3"
            buttons-preset="secondary" rounded gapped border-color="primary" @update:model-value="handlePagination" />
        </div>
      </div>
    </va-card-content>
  </va-card>
</template>
<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DataTable from '../../../components/ui/DataTable.vue'
import { Filter, SearchForm } from '../../../data/types'
import { useTaxonomyStore } from '../../../stores/taxonomy-store'
import TaxonService from '../../../services/clients/TaxonService'
import StatisticsService from '../../../services/clients/StatisticsService'
import { useI18n } from 'vue-i18n'
import FilterForm from '../../../components/ui/FilterForm.vue'
import { tableFilters, tableColumns } from '../configs'

const { t } = useI18n()
const TaxonomyStore = useTaxonomyStore()
const offset = ref(1 + TaxonomyStore.pagination.offset)
const total = ref(0)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const filters = ref<Filter[]>(tableFilters)


const taxons = ref([])

onMounted(async () => {
  await getTaxons({ ...TaxonomyStore.searchForm, ...TaxonomyStore.pagination })
  await setRanks()

})

function handleSubmit(payload: SearchForm) {
  TaxonomyStore.searchForm = { ...payload }
  TaxonomyStore.resetPagination()
  offset.value = 1
  getTaxons({ ...TaxonomyStore.searchForm, ...TaxonomyStore.pagination })
}
function handlePagination(value: number) {
  TaxonomyStore.pagination.offset = value - 1
  getTaxons({ ...TaxonomyStore.searchForm, ...TaxonomyStore.pagination })
}
function reset() {
  offset.value = 1
  TaxonomyStore.resetForm()
  TaxonomyStore.resetPagination()
  getTaxons({ ...TaxonomyStore.searchForm, ...TaxonomyStore.pagination })
}

async function getTaxons(query: Record<string, any>) {
  try {
    isLoading.value = true
    const { data } = await TaxonService.getTaxons(query)
    taxons.value = data.data
    total.value = data.total
  } catch (e) {
    errorMessage.value = 'Something happened'
  } finally {
    isLoading.value = false
  }
}


async function setRanks() {
  if (filters.value.findIndex(f => f.key === 'ranks') === -1) return
  try {
    isLoading.value = true
    const { data } = await StatisticsService.getModelFieldStats('taxons', { field: 'rank' })
    const ranks = Object.keys(data)
    const newFilters = [...filters.value]
    newFilters.push({
      label: 'taxonList.filters.ranks',
      key: 'rank',
      type: 'select',
      options: ranks,
    })
    filters.value = [...newFilters]
  } catch (e) {
    errorMessage.value = 'Something happened'
  } finally {
    isLoading.value = false
  }
}
</script>
