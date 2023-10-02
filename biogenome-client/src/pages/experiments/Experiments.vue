<template>
  <div>
    <va-breadcrumbs class="va-title" color="primary">
      <va-breadcrumbs-item :to="{ name: 'experiments' }" :label="t('experimentList.breadcrumb')" />
    </va-breadcrumbs>
    <va-divider />
    <InfoBlockVue v-if="charts.length" :charts="charts" />
    <div class="row row-equal">
      <div class="flex lg12 md12 sm12 xs12">
        <va-skeleton v-if="isLoading" height="300px" />
        <va-card stripe-color="danger" stripe v-else-if="errorMessage">
          <va-card-content>
            {{ errorMessage }}
          </va-card-content>
        </va-card>
        <va-card v-else>
          <FilterForm :filters="filters" @on-reset="reset" @on-submit="handleSubmit" />
          <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
          <va-card-content>
            <DataTable :items="experiments" :columns="tableColumns" />
            <div class="row align-center justify-center">
              <div class="flex">
                <va-pagination v-model="offset" :page-size="readStore.pagination.limit" :total="total" :visible-pages="3"
                  buttons-preset="secondary" rounded gapped border-color="primary"
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
import { experimentInfoBlocks } from '../../../config.json'
import { useI18n } from 'vue-i18n'
import InfoBlockVue from '../../components/InfoBlock.vue'
import ReadService from '../../services/clients/ReadService'
import { onMounted, ref, watch } from 'vue'
import { useReadStore } from '../../stores/read-store'
import DataTable from '../../components/ui/DataTable.vue'
import { Filter, InfoBlock, ReadSearchForm } from '../../data/types'
import FilterForm from '../../components/ui/FilterForm.vue'
import { tableFilters, tableColumns } from './configs'

const readStore = useReadStore()
const { t } = useI18n()
const filters = ref<Filter[]>(tableFilters)
const charts = <InfoBlock[]>experimentInfoBlocks
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const offset = ref(1 + readStore.pagination.offset)

const experiments = ref([])
const total = ref(0)

onMounted(async () => {
  getReads({ ...readStore.searchForm, ...readStore.pagination })
})

async function handleSubmit(payload: ReadSearchForm) {
  readStore.searchForm = { ...payload }
  readStore.resetPagination()
  offset.value = 1
  getReads({ ...readStore.searchForm, ...readStore.pagination })
}
async function handlePagination(value: number) {
  readStore.pagination.offset = value - 1
  getReads({ ...readStore.searchForm, ...readStore.pagination })
}

async function reset() {
  offset.value = 1
  readStore.resetForm()
  readStore.resetPagination()
  getReads({ ...readStore.pagination })
}

async function getReads(query: Record<string, any>) {
  try {
    isLoading.value = true
    const { data } = await ReadService.getReads(query)
    experiments.value = data.data
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
