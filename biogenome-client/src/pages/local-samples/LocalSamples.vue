<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item active :to="{ name: 'local_samples' }" :label="t('localSampleDetails.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <InfoBlockVue v-if="charts.length" :charts="charts" />
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-card :stripe="Boolean(errorMessage)" stripe-color="danger">
          <FilterForm :search-form="localSampleStore.searchForm" :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
          <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
          <va-skeleton v-if="isLoading" height="400px" />
          <va-card-content v-else-if="errorMessage">
            {{ errorMessage }}
          </va-card-content>
          <va-card-content v-else>
            <DataTable :items="localSamples" :columns="tableColumns" />
            <div class="row align-center justify-center">
              <div class="flex">
                <va-pagination v-model="offset" :page-size="localSampleStore.pagination.limit" :total="total"
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
import InfoBlockVue from '../../components/InfoBlock.vue';
import { useI18n } from 'vue-i18n'
import { tableFilters, tableColumns } from './configs'
import { localSampleInfoBlock } from '../../../config.json'
import { ref, onMounted } from 'vue';
import { Filter, InfoBlock } from '../../data/types';
import FilterForm from '../../components/ui/FilterForm.vue';
import DataTable from '../../components/ui/DataTable.vue';
import LocalSampleService from '../../services/clients/LocalSampleService'
import { useLocalSampleStore } from '../../stores/local-sample-store'

const { t } = useI18n()

const charts = <InfoBlock[]>localSampleInfoBlock
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const localSampleStore = useLocalSampleStore()

const filters = ref<Filter[]>(tableFilters)
const offset = ref(1 + localSampleStore.pagination.offset)

const localSamples = ref([])
const total = ref(0)


onMounted(() => {
  getLocalSamples({ ...localSampleStore.searchForm, ...localSampleStore.pagination })
})

async function handleSubmit() {
  localSampleStore.resetPagination()
  offset.value = 1
  getLocalSamples({ ...localSampleStore.searchForm, ...localSampleStore.pagination })
}
async function handlePagination(value: number) {
  localSampleStore.pagination.offset = value - 1
  getLocalSamples({ ...localSampleStore.searchForm, ...localSampleStore.pagination })
}

async function reset() {
  offset.value = 1
  localSampleStore.resetSearchForm()
  localSampleStore.resetPagination()
  getLocalSamples({ ...localSampleStore.pagination })
}

async function getLocalSamples(query: Record<string, any>) {
  try {
    const { data } = await LocalSampleService.getLocalSamples(query)
    localSamples.value = data.data
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
  