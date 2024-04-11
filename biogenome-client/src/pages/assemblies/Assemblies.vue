<template>
  <InfoBlockVue v-if="charts.length" :charts="charts" />
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card :stripe="Boolean(errorMessage)" stripe-color="danger">
        <FilterForm :search-form="assemblyStore.searchForm" :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
        <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
        <va-skeleton v-if="isLoading" height="400px" />
        <va-card-content v-else-if="errorMessage">
          {{ errorMessage }}
        </va-card-content>
        <va-card-content v-else>
          <DataTable :items="items" :columns="assemblies.columns" />
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
import { assemblies } from '../../../config.json'
import { useI18n } from 'vue-i18n'
import { InfoBlock } from '../../data/types'
import { useAssemblyStore } from '../../stores/assembly-store'
import AssemblyService from '../../services/clients/AssemblyService'
import { onMounted, ref } from 'vue'
import DataTable from '../../components/ui/DataTable.vue'
import { Filter } from '../../data/types'
import FilterForm from '../../components/ui/FilterForm.vue'

const { t } = useI18n()

const charts = assemblies.charts as InfoBlock[]

const assemblyStore = useAssemblyStore()
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)

const filters = ref(assemblies.filters as Filter[])
const offset = ref(1 + assemblyStore.pagination.offset)
const items = ref([])
const total = ref(0)

onMounted(() => {
  getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination })
})

function handleSubmit(payload:Record<string,string>) {
  assemblyStore.resetPagination()
  offset.value = 1
  assemblyStore.searchForm = {...assemblyStore.searchForm, ...payload}
  getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination })
}
function handlePagination(value: number) {
  assemblyStore.pagination.offset = value - 1
  getAssemblies({ ...assemblyStore.searchForm, ...assemblyStore.pagination })
}
function reset() {
  offset.value = 1
  assemblyStore.resetSearchForm()
  assemblyStore.resetPagination()
  getAssemblies({ ...assemblyStore.pagination })
}

async function getAssemblies(query: Record<string, any>) {
  try {
    const { data } = await AssemblyService.getAssemblies(query)
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
