<template>
    <va-card>
      <va-form tag="form" @submit.prevent="handleSubmit">
        <va-card-content>
          <div class="row align-center justify-start">
            <div v-for="(filter, index) in filters" :key="index" class="flex lg4 md4 sm12 xs12">
              <div v-if="filter.type === 'input'">
                <va-input v-model="TaxonomyStore.searchForm[filter.key]" :label="t(filter.label)" />
              </div>
              <div v-else>
                <va-select v-model="TaxonomyStore.searchForm[filter.key]" :label="t(filter.label)" :options="filter.options" />
              </div>

            </div>
            <div v-if="TaxonomyStore.ranks.length" class="flex lg4 md4 sm12 xs12">
                <va-select searchable v-model="TaxonomyStore.searchForm.rank" :label="t('taxonList.filters.ranks')" :options="TaxonomyStore.ranks" />
            </div>
          </div>
        </va-card-content>
        <va-card-actions align="between">
          <va-button type="submit">{{t('buttons.submit')}}</va-button>
          <va-button color="danger" @click="reset()">{{t('buttons.reset')}}</va-button>
        </va-card-actions>
      </va-form>
      <va-card-content> {{t('table.total')}} {{ total }} </va-card-content>
      <va-card-content>
        <DataTable :items="taxons" :columns="columns" />
        <div class="row align-center justify-center">
          <div class="flex">
            <va-pagination
              v-model="offset"
              :page-size="TaxonomyStore.pagination.limit"
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
</template>
<script setup lang="ts">
  import { onMounted, ref } from 'vue'
  import { AxiosResponse } from 'axios'
  import DataTable from '../../components/ui/DataTable.vue'
  import { Filter } from '../../data/types'
  import { useTaxonomyStore } from '../../stores/taxonomy-store'
  import TaxonService from '../../services/clients/TaxonService'
  import StatisticsService from '../../services/clients/StatisticsService'
  import { useI18n } from 'vue-i18n'
      
  const { t } = useI18n()
  const TaxonomyStore = useTaxonomyStore()
  const offset = ref(1)
  const total = ref(0)

  const columns = ['taxon_taxid', 'name', 'rank', 'organisms']

  const filters: Filter[] = [
    {
      label: 'taxonList.filters.searchInput',
      placeholder: 'Search by name or taxid',
      key: 'filter',
      type: 'input',
    },
    {
      label: 'taxonList.filters.sortColumn',
      key: 'sort_column',
      type: 'select',
      options: ['leaves'],
    },
    {
      label: 'taxonList.filters.sortOrder',
      key: 'sort_order',
      type: 'select',
      options: ['asc', 'desc'],
    },
  ]

  const taxons = ref([])

  onMounted(async () => {
    getTaxons(await TaxonService.getTaxons({ ...TaxonomyStore.searchForm, ...TaxonomyStore.pagination }))
    const {data} = await StatisticsService.getModelFieldStats('taxons', {field:'rank'})
    TaxonomyStore.ranks = [...Object.keys(data)]
  })

  async function handleSubmit() {
    offset.value = 1
    TaxonomyStore.resetPagination()
    getTaxons(await TaxonService.getTaxons({ ...TaxonomyStore.searchForm, ...TaxonomyStore.pagination }))
  }
  async function handlePagination(value: number) {
    TaxonomyStore.pagination.offset = value - 1
    getTaxons(await TaxonService.getTaxons({ ...TaxonomyStore.searchForm, ...TaxonomyStore.pagination }))
  }
  async function reset() {
    offset.value = 1
    TaxonomyStore.resetForm()
    TaxonomyStore.resetPagination()
    getTaxons(await TaxonService.getTaxons({ ...TaxonomyStore.searchForm, ...TaxonomyStore.pagination }))
  }

  function getTaxons({ data }: AxiosResponse) {
    taxons.value = data.data
    total.value = data.total
    return data
  }
</script>
