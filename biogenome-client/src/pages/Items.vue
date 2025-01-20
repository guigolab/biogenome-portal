<template>
    <div>
        <div class="row">
            <div class="flex">
                <Header title-class="va-h1" description-class="va-text-secondary"
                    :title="(modelConfigs.title as LangOption)"
                    :description="(modelConfigs.description as LangOption)" />
            </div>
        </div>
        <div class="row">
            <div class="flex lg12 md12 sm12 xs12">
                <VaCard>
                    <VaCardContent>
                        <TaxonSearch />
                    </VaCardContent>
                </VaCard>
            </div>
        </div>
        <div class="row row-equal">
            <div v-if="filters.length" class="flex lg3 md4 sm12 xs12">
                <VaCard>
                    <VaCardContent>
                        <div class="row align-center justify-space-between">
                            <div class="flex">
                                <h3 class="va-h6">Filters</h3>
                            </div>
                            <div class="flex">
                                <VaButton :disabled="activeFilters.length === 0" @click="resetFilters()"
                                    preset="secondary" icon="fa-close" color="textPrimary">
                                    Clear filters</VaButton>
                            </div>
                        </div>
                    </VaCardContent>
                    <VaCardContent>
                        <ModelFilters :filters="filters" :model="model" />
                    </VaCardContent>
                </VaCard>
            </div>
            <div :class="contentClass">
                <VaCard>
                    <VaCardContent>
                        <div class="row align-center justify-space-between">
                            <div class="flex">
                                <div class="row align-center">
                                    <div class="flex">
                                        <h3 class="va-h6">Results: {{ total }}</h3>

                                    </div>
                                    <div v-if="taxonomyStore.currentTaxon" class="flex">
                                        <VaChip @click="taxonomyStore.resetTaxon" icon="fa-close" outline
                                            color="textPrimary"> Selected
                                            taxon:
                                            {{
                                                strippedName }}
                                        </VaChip>
                                    </div>
                                </div>
                            </div>

                            <div class="flex">
                                <div class="row">
                                    <div class="flex">
                                        <VaMenu>
                                            <VaMenuItem icon="fa-table"
                                                @selected="itemStore.showTsvModal = !itemStore.showTsvModal">
                                                Report
                                            </VaMenuItem>
                                            <VaMenuItem icon="fa-chart-line"
                                                @selected="itemStore.showChartModal = !itemStore.showChartModal">
                                                Chart
                                            </VaMenuItem>
                                            <template #anchor>
                                                <VaButton preset="secondary" color="textPrimary" icon="fa-file-export">
                                                    Export
                                                </VaButton>
                                            </template>
                                        </VaMenu>
                                    </div>
                                    <div v-if="charts.length" class="flex">
                                        <VaButton color="textPrimary" class="ml-6"
                                            :preset="opt.value === itemStore.view ? 'primary' : 'secondary'"
                                            v-for="opt in options" :icon="opt.icon" @click="itemStore.view = opt.value">
                                        </VaButton>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </VaCardContent>
                    <VaCardContent v-if="itemStore.view === 'table'">
                        <Table :columns="columns" :model="model" />
                    </VaCardContent>

                    <VaCardContent v-else>
                        <div class="row">
                            <div v-for="chart, index in charts" :key="`${index}-${chart.model}-${chart.field}`"
                                :class="chart.class">
                                <Chart :chart="chart" :index="index" :ignore-query="false" />
                            </div>
                        </div>
                    </VaCardContent>
                </VaCard>
            </div>
        </div>
        <CreateChart :model="model" :filters="filters" />
        <ExportTSV :model="model" :columns="columns" />
    </div>

</template>
<script setup lang="ts">
import Chart from '../components/Chart.vue';
import Table from '../components/Table.vue';
import { computed, inject, watch } from 'vue'
import { DataModels, LangOption, AppConfig, ConfigModel } from '../data/types'
import ExportTSV from '../components/modals/ExportTSV.vue'
import CreateChart from '../components/modals/CreateChart.vue'
import Header from '../components/Header.vue';
import TaxonSearch from '../components/taxon/TaxonSearch.vue';
import ModelFilters from '../components/ModelFilters.vue';
import { useItemStore } from '../stores/items-store';
import { useTaxonomyStore } from '../stores/taxonomy-store';

const config = inject('appConfig') as AppConfig

const props = defineProps<{
    model: DataModels
}>()

const strippedName = computed(() => taxonomyStore.currentTaxon && taxonomyStore.currentTaxon.name.length > 9 ?
    taxonomyStore.currentTaxon.name.slice(0, 9) + '..'
    : taxonomyStore.currentTaxon?.name)
const itemStore = useItemStore()
const taxonomyStore = useTaxonomyStore()

const modelConfigs = computed(() => config.models[props.model] as ConfigModel)

const charts = computed(() => modelConfigs.value.charts ?? [])
const filters = computed(() => modelConfigs.value.filters ?? [])
const columns = computed(() => modelConfigs.value.columns ?? [])
const total = computed(() => itemStore.total)

const contentClass = computed(() => filters.value.length ? 'flex lg9 md8 sm12 xs12' : 'lg12 md12 sm12 xs12')

const activeFilters = computed(() => Object.entries(itemStore.searchForm ?? {})
    .filter(([k, v]) => k !== 'taxon_lineage' && k !== 'sort_column' && k !== 'sort_order' && v !== null)
    .map(([k, v]) => k))



watch(() => props.model, async () => {
    itemStore.initStore(props.model, modelConfigs.value.filters ?? [])
    itemStore.setSearchFormField('taxon_lineage', taxonomyStore.currentTaxon?.taxid)
    await itemStore.handleQuery()
}, { immediate: true })


watch(() => taxonomyStore.currentTaxon, async () => {
    itemStore.setSearchFormField('taxon_lineage', taxonomyStore.currentTaxon?.taxid)
    await itemStore.handleQuery()
}, { immediate: true })


const options: { value: 'table' | 'charts', icon: string }[] = [
    { value: "table", icon: "fa-table", },
    { value: "charts", icon: "leaderboard", },
]

async function resetFilters() {
    itemStore.resetFilters()
    await itemStore.handleQuery()
}

// const staticFiltersKeys = Object.keys(staticFilters)
// const route = useRoute()
// // const itemStore = useItemStore()
// const currentModel = computed(() => {
//     return props.model || route.name as DataModels
// })


// const parentTaxon = computed(() => itemStore.parentTaxon)

// watch(() => parentTaxon.value, async () => {
//     await itemStore.handleQuery(currentModel.value)
// })

// const activeFilters = computed(() =>
//     Object.entries(itemStore.stores[currentModel.value].searchForm)
//         .filter(([k, v]) => v !== null && v !== '' && !staticFiltersKeys.includes(k))
// );

// const showCountriesSelect = computed(() => itemStore.country && props.model === 'organisms')

// const hasActiveFilters = computed(() => activeFilters.value.length || itemStore.parentTaxon || showCountriesSelect.value)

// const charts = computed(() => {
//     const { charts } = useConfig(currentModel.value)
//     return charts.value
// })

// const hasCharts = computed(() => charts.value.length > 0)

// watch(() => currentModel.value, async () => {
//     await itemStore.handleQuery(currentModel.value)
// }, { immediate: true })



</script>