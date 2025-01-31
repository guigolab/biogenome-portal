<template>
    <VaCard>
        <VaCardContent>
            <div class="row align-center justify-space-between">
                <div class="flex">
                    <div class="row align-center">
                        <div class="flex">
                            <h3 class="va-h6">{{ t('items.data.results') }} {{ total }}</h3>
                        </div>
                        <div v-if="taxonomyStore.currentTaxon" class="flex">
                            <TaxonChip />
                        </div>
                    </div>
                </div>
                <div class="flex">
                    <div class="row">
                        <div class="flex">
                            <VaButton @click="itemStore.showTsvModal = !itemStore.showTsvModal" icon="fa-table"
                                preset="primary" color="textPrimary">
                                {{ t('items.data.reportBtn') }}
                            </VaButton>
                        </div>
                        <div class="flex">
                            <VaButton @click="itemStore.showChartModal = !itemStore.showChartModal" icon="fa-chart-line"
                                color="textPrimary" preset="primary">
                                {{ t('items.data.chartBtn') }}
                            </VaButton>
                        </div>
                        <div v-if="charts.length" class="flex">
                            <VaButton color="textPrimary" class="ml-6"
                                :preset="opt.value === itemStore.view ? 'primary' : 'secondary'" v-for="opt in options"
                                :icon="opt.icon" @click="itemStore.view = opt.value">
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
        <CreateChart :model="model" :filters="filters" />
        <ExportTSV :model="model" :columns="columns" />
    </VaCard>
</template>
<script setup lang="ts">
import Chart from '../components/Chart.vue';
import Table from '../components/Table.vue';
import { computed, inject } from 'vue'
import { DataModels, AppConfig, ConfigModel } from '../data/types'
import ExportTSV from '../components/ModelExport.vue'
import CreateChart from '../components/ModelChart.vue'
import { useItemStore } from '../stores/items-store';
import { useTaxonomyStore } from '../stores/taxonomy-store';
import TaxonChip from './TaxonChip.vue';
import { useI18n } from 'vue-i18n';


const { t } = useI18n()
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
const filters = computed(() => modelConfigs.value.filters ? [...itemStore.customFilters, ...modelConfigs.value.filters] : [...itemStore.customFilters])

const columns = computed(() => modelConfigs.value.columns ?? [])
const total = computed(() => itemStore.total)

const options: { value: 'table' | 'charts', icon: string }[] = [
    { value: "table", icon: "fa-table", },
    { value: "charts", icon: "leaderboard", },
]


</script>