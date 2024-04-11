<template>
  <div>
    <InfoBlockVue v-if="charts.length" :charts="charts" />
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-card :stripe="Boolean(errorMessage)" stripe-color="danger">
          <FilterForm :search-form="biosampleStore.searchForm" :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
          <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
          <va-skeleton v-if="isLoading" height="400px" />
          <va-card-content v-else-if="errorMessage">
            {{ errorMessage }}
          </va-card-content>
          <va-card-content v-else>
            <DataTable :items="items" :columns="biosamples.columns" />
            <div class="row align-center justify-center">
              <div class="flex">
                <va-pagination v-model="offset" :page-size="biosampleStore.pagination.limit" :total="total"
                  :visible-pages="3" buttons-preset="secondary" rounded gapped border-color="primary"
                  @update:model-value="handlePagination" />
              </div>
            </div>
          </va-card-content>
        </va-card>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import InfoBlockVue from '../../components/InfoBlock.vue'
import { biosamples } from '../../../config.json'
import FilterForm from '../../components/ui/FilterForm.vue'
import { useI18n } from 'vue-i18n'
import { useBioSampleStore } from '../../stores/biosample-store'
import { Filter, InfoBlock } from '../../data/types'
import { onMounted, ref } from 'vue'
import BioSampleService from '../../services/clients/BioSampleService'
import DataTable from '../../components/ui/DataTable.vue'

const biosampleStore = useBioSampleStore()
const filters = ref(biosamples.filters as Filter[])
const charts = biosamples.charts as InfoBlock[]
const { t } = useI18n()
const items = ref([])
const total = ref(0)
const offset = ref(1 + biosampleStore.pagination.offset)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
onMounted(() => {
  getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination })
})

function handleSubmit() {
  biosampleStore.resetPagination()
  offset.value = 1
  getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination })
}

function handlePagination(value: number) {
  biosampleStore.pagination.offset = value - 1
  getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination })
}

function reset() {
  offset.value = 1
  biosampleStore.resetSearchForm()
  biosampleStore.resetPagination()
  getBioSamples({ ...biosampleStore.pagination })
}

async function getBioSamples(query: Record<string, any>) {
  try {
    const { data } = await BioSampleService.getBioSamples(query)
    items.value = data.data
    total.value = data.total
  } catch (e) {
    errorMessage.value = 'Something happened'
  } finally {
    isLoading.value = false
  }


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
