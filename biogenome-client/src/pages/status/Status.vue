<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item active :to="{ name: 'status' }" :label="t('statusList.breadcrumb')" />
  </va-breadcrumbs>
  <va-divider />
  <InfoBlockVue v-if="charts.length" :charts="charts" />
  <div class="row justify-end">
    <div class="flex">
      <va-button @click="downloadReport" preset="secondary" icon="fa-download">Download GoaT Report</va-button>
    </div>
  </div>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12">
      <va-skeleton v-if="isLoading" height="400px" />
      <va-card stripe-color="danger" style="height: 400px;" stripe v-else-if="errorMessage">
        <va-card-content>
          {{ errorMessage }}
        </va-card-content>
      </va-card>
      <va-card v-else>
        <FilterForm :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
        <DataTable :items="organisms" :columns="tableColumns" />
        <div class="row align-center justify-center">
          <div class="flex">
            <va-pagination v-model="offset" :page-size="statusStore.pagination.limit" :total="total" :visible-pages="3"
              buttons-preset="secondary" rounded gapped border-color="primary" @update:model-value="handlePagination" />
          </div>
        </div>
      </va-card>
    </div>
  </div>
</template>
<script setup lang="ts">
import DataTable from '../../components/ui/DataTable.vue'
import { onMounted, ref } from 'vue'
import { Filter, InfoBlock } from '../../data/types'
import { useStatusStore } from '../../stores/status-store'
import OrganismService from '../../services/clients/OrganismService'
import GoaTService from '../../services/clients/GoaTService'
import { useI18n } from 'vue-i18n'
import { tableFilters, tableColumns } from './configs'
import { statusInfoBlocks } from '../../../config.json'
import InfoBlockVue from '../../components/InfoBlock.vue'
import FilterForm from '../../components/ui/FilterForm.vue'

const charts = <InfoBlock[]>statusInfoBlocks

const { t } = useI18n()
const filters = ref<Filter[]>(tableFilters)

const statusStore = useStatusStore()
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const offset = ref(1)
const total = ref(0)

const organisms = ref<Record<string,any>[]>([])



onMounted(async () => {
  await getOrganisms({ ...statusStore.searchForm, ...statusStore.pagination })
})

function handleSubmit() {
  offset.value = 1
  statusStore.resetPagination()
  getOrganisms({ ...statusStore.searchForm, ...statusStore.pagination })
}

function reset() {
  offset.value = 1
  statusStore.resetPagination()
  statusStore.resetSearchForm()
  getOrganisms({ ...statusStore.searchForm, ...statusStore.pagination })
}

async function handlePagination(value: number) {
  statusStore.pagination.offset = value - 1
  getOrganisms({ ...statusStore.searchForm, ...statusStore.pagination })
}

async function getOrganisms(query:Record<string,any>) {
  try{
    isLoading.value = true
    const {data} = await OrganismService.getOrganisms(query)
    organisms.value = data.data
    total.value = data.total
  }catch(e){
    errorMessage.value = `Error ${e}`
  }finally{
    isLoading.value = true
  }
}

async function downloadReport() {
  const response = await GoaTService.getGoatReport({ download: true, ...statusStore.searchForm })
  console.log(response)
  const data = response.data
  const href = URL.createObjectURL(data);

  // create "a" HTML element with href to file & click
  const link = document.createElement('a');
  link.href = href;
  link.setAttribute('download', 'file.tsv'); //or any other extension
  document.body.appendChild(link);
  link.click();

  // clean up "a" element & remove ObjectURL
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
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

.selected::before {
  background-color: var(--va-primary);
  opacity: var(--va-tree-node-interactive-bg-opacity);
  content: '';
  background-color: var(--va-primary);
  border-radius: var(--va-tree-node-border-radius);
  bottom: 0;
  left: 0;
  opacity: 0;
  pointer-events: none;
  position: absolute;
  right: 0;
  top: 0;
}
</style>
