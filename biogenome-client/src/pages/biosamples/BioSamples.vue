<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'biosamples', params: { savePosition: true } }"
        :label="t('biosampleList.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <InfoBlockVue v-if="charts.length" :charts="charts" />
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-skeleton v-if="isLoading" height="300px"/>
        <va-card stripe-color="danger" stripe v-else-if="errorMessage">
          <va-card-content>
            {{ errorMessage }}
          </va-card-content>
        </va-card>
        <va-card v-else>
          <FilterForm :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
          <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
          <va-card-content>
            <DataTable :items="biosamples" :columns="tableColumns" />
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
import { bioSampleInfoBlocks } from '../../../config.json'
import FilterForm from '../../components/ui/FilterForm.vue'
import { useI18n } from 'vue-i18n'
import { tableFilters, tableColumns } from './configs'
import { useBioSampleStore } from '../../stores/biosample-store'
import { BioSampleSearchForm, Filter, InfoBlock } from '../../data/types'
import { onMounted, ref } from 'vue'
import BioSampleService from '../../services/clients/BioSampleService'
import DataTable from '../../components/ui/DataTable.vue'

const biosampleStore = useBioSampleStore()
const filters = ref<Filter[]>(tableFilters)
const charts = <InfoBlock[]>bioSampleInfoBlocks
const { t } = useI18n()
const biosamples = ref([])
const total = ref(0)
const offset = ref(1 + biosampleStore.pagination.offset)
const isLoading = ref(false)
const errorMessage = ref<string|null>(null)
onMounted(() => {
  getBioSamples({ ...biosampleStore.searchForm, ...biosampleStore.pagination })
})

function handleSubmit(payload: BioSampleSearchForm) {
  biosampleStore.searchForm = { ...payload }
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
  biosampleStore.resetForm()
  biosampleStore.resetPagination()
  getBioSamples({ ...biosampleStore.pagination })
}

async function getBioSamples(query: Record<string, any>) {
  try {
    isLoading.value = true
    const { data } = await BioSampleService.getBioSamples(query)
    biosamples.value = data.data
    total.value = data.total
  } catch(e){
    errorMessage.value = 'Something happened'
  }finally{
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
