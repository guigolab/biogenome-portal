<template>
  <va-breadcrumbs class="va-title" color="primary">
    <va-breadcrumbs-item active :label="t('annotationDetails.breadcrumb')" />
  </va-breadcrumbs>
  <va-divider />
  <InfoBlockVue v-if="charts.length" :charts="charts"></InfoBlockVue>
  <div class="row row-equal">
    <div class="flex lg12 md12 sm12 xs12">
      <va-card :stripe="Boolean(errorMessage)" stripe-color="danger">
        <FilterForm :search-form="annotationStore.searchForm" :filters="filters" @on-submit="handleSubmit" @on-reset="reset" />
        <va-card-content> {{ t('table.total') }} {{ total }} </va-card-content>
        <va-skeleton v-if="isLoading" height="400px" />
        <va-card-content v-else-if="errorMessage">
          {{ errorMessage }}
        </va-card-content>
        <va-card-content v-else>
          <DataTable :items="annotations" :columns="tableColumns" />
          <div class="row align-center justify-center">
            <div class="flex">
              <va-pagination v-model="offset" :page-size="annotationStore.pagination.limit" :total="total"
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
import { useI18n } from 'vue-i18n'
import { annotationInfoBlock } from '../../../config.json'
import { tableColumns, tableFilters } from './configs';
import { useAnnotationStore } from '../../stores/annotation-store';
import InfoBlockVue from '../../components/InfoBlock.vue';
import { InfoBlock, Filter } from '../../data/types';
import FilterForm from '../../components/ui/FilterForm.vue';
import { ref, onMounted } from 'vue';
import AnnotationService from '../../services/clients/AnnotationService'
import DataTable from '../../components/ui/DataTable.vue';

const { t } = useI18n()
const annotationStore = useAnnotationStore()
const annotations = ref([])
const total = ref(0)
const offset = ref(1 + annotationStore.pagination.offset)
const isLoading = ref(true)
const errorMessage = ref<string | null>(null)
const filters = ref<Filter[]>(tableFilters)
const charts = <InfoBlock[]>annotationInfoBlock

onMounted(() => {
  getAnnotations({ ...annotationStore.searchForm, ...annotationStore.pagination })
})

async function handleSubmit() {
  annotationStore.resetPagination()
  offset.value = 1
  getAnnotations({ ...annotationStore.searchForm, ...annotationStore.pagination })
}
async function handlePagination(value: number) {
  annotationStore.pagination.offset = value - 1
  getAnnotations({ ...annotationStore.searchForm, ...annotationStore.pagination })
}

async function reset() {
  offset.value = 1
  annotationStore.resetSeachForm()
  annotationStore.resetPagination()
  getAnnotations({ ...annotationStore.pagination })
}

async function getAnnotations(query: Record<string, any>) {
  try {
    const { data } = await AnnotationService.getAnnotations(query)
    annotations.value = data.data
    total.value = data.total
  } catch {
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

.va-card {
  margin-bottom: 0 !important;

  &__title {
    display: flex;
    justify-content: space-between;
  }
}

.list__item+.list__item {
  margin-top: 10px;
}
</style>
  