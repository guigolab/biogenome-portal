<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item active :to="{ name: 'assemblies' }" :label="t('assemblyDetails.breadcrumb')" />
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
        <FilterForm :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
        <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
        <va-card-content>
          <DataTable :items="assemblies" :columns="tableColumns" />
          <div class="row align-center justify-center">
            <div class="flex">
              <va-pagination v-model="offset" :page-size="assemblyStore.pagination.limit" :total="total"
                :visible-pages="3" buttons-preset="secondary" rounded gapped border-color="primary"
                @update:model-value="handlePagination" />
            </div>
          </div>
        </va-card-content>
      </va-card>
    </div>
  </div>
</template>
<script setup lang="ts">
import InfoBlockVue from '../../components/InfoBlock.vue'
import { assemblyInfoBlock } from '../../../config.json'
import { useI18n } from 'vue-i18n'
import { InfoBlock } from '../../data/types'
import { useAssemblyStore } from '../../stores/assembly-store'
import AssemblyService from '../../services/clients/AssemblyService'
import { onMounted, ref } from 'vue'
import DataTable from '../../components/ui/DataTable.vue'
import { AssemblySearchForm, Filter } from '../../data/types'
import FilterForm from '../../components/ui/FilterForm.vue'
import { tableFilters, tableColumns } from './configs'

const { t } = useI18n()

const charts = <InfoBlock[]>assemblyInfoBlock

const assemblyStore = useAssemblyStore()
const isLoading = ref(false)
const errorMessage = ref<string | null>(null)

const filters = ref<Filter[]>(tableFilters)
const offset = ref(1 + assemblyStore.pagination.offset)
const assemblies = ref([])
const total = ref(0)

onMounted(() => {
  getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination })
})

function handleSubmit(payload: AssemblySearchForm) {
  assemblyStore.searchForm = { ...payload }
  assemblyStore.resetPagination()
  offset.value = 1
  getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination })
}
function handlePagination(value: number) {
  assemblyStore.pagination.offset = value - 1
  getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination })
}
function reset() {
  offset.value = 1
  assemblyStore.resetForm()
  assemblyStore.resetPagination()
  getAssemblies({ ...assemblyStore.pagination })
}

async function getAssemblies(query: Record<string, any>) {
  try {
    isLoading.value = true
    const { data } = await AssemblyService.getAssemblies(query)
    assemblies.value = data.data
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
