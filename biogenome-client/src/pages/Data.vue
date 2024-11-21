<template>
    <Header :taxName="parentTaxon?.name" v-if="config" :title="(config.title as LangOption)"
        :description="(config.description as LangOption)" />
    <FilterBar :model="currentModel" :hasCharts="hasCharts" />
    <ActiveFilters v-if="hasActiveFilters" :model="currentModel" />
    <Charts v-if="itemStore.view === 'charts'" :source="currentModel" :charts="charts" />
    <Table v-else :model="currentModel" />
    <ExportTSV :model="currentModel" />
    <CreateChart :model="currentModel" />
</template>
<script setup lang="ts">
import Charts from '../sections/Charts.vue';
import Table from '../sections/Table.vue';
import { computed, watch } from 'vue'
import { DataModels, LangOption, ModelConfig } from '../data/types'
import { useRoute } from 'vue-router'
import { useItemStore, staticFilters } from '../stores/items-store'
import { useConfig } from '../composable/useConfig'
import ExportTSV from '../components/modals/ExportTSV.vue'
import CreateChart from '../components/modals/CreateChart.vue'
import ActiveFilters from '../sections/ActiveFilters.vue';
import Header from '../sections/Header.vue';
import FilterBar from '../components/bars/FilterBar.vue';

const props = defineProps<{
    config?: ModelConfig,
    model?: DataModels
}>()

const staticFiltersKeys = Object.keys(staticFilters)
const route = useRoute()
const itemStore = useItemStore()
const currentModel = computed(() => {
    return props.model || route.name as DataModels
})


const parentTaxon = computed(() => itemStore.parentTaxon)

watch(() => parentTaxon.value, async () => {
    await itemStore.handleQuery(currentModel.value)
})

const activeFilters = computed(() =>
    Object.entries(itemStore.stores[currentModel.value].searchForm)
        .filter(([k, v]) => v !== null && v !== '' && !staticFiltersKeys.includes(k))
);

const showCountriesSelect = computed(() => itemStore.country && props.model === 'organisms')

const hasActiveFilters = computed(() => activeFilters.value.length || itemStore.parentTaxon || showCountriesSelect.value)

const charts = computed(() => {
    const { charts } = useConfig(currentModel.value)
    return charts.value
})

const hasCharts = computed(() => charts.value.length > 0)

watch(() => currentModel.value, async () => {
    await itemStore.handleQuery(currentModel.value)
}, { immediate: true })



</script>