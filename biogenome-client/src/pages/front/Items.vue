<template>
    <div class="layout fluid va-gutter-3">
        <div class="content-section">
            <div class="filters-section">
                <ItemFilter :model="model" :has-charts="hasCharts" />
            </div>
            <VaCard v-if="itemStore.view === 'table'" class="data-card">
                <Table :columns="columns" :model="model" />
            </VaCard>
            <div v-else class="row">
                <div v-for="chart, index in charts" :key="`${index}-${chart.model}-${chart.field}`"
                    :class="chart.class">
                    <Chart :chart="chart" :index="index" :ignore-query="false" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject, watch } from 'vue'
import { DataModels, AppConfig, ConfigModel } from '../../data/types'
import Chart from '../../components/Chart.vue'
import Table from '../../components/Table.vue'
import { useItemStore } from '../../stores/items-store'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import ItemFilter from '../../components/ItemsFilter.vue'

const props = defineProps<{
    model: DataModels
}>()

const config = inject('appConfig') as AppConfig

const itemStore = useItemStore()
const taxonomyStore = useTaxonomyStore()

const modelConfigs = computed(() => config.models[props.model] as ConfigModel)
const charts = computed(() => modelConfigs.value.charts ?? [])
const columns = computed(() => modelConfigs.value.columns ?? [])
const hasCharts = computed(() => charts.value.length > 0)

watch(() => props.model, async (newValue) => {
    await itemStore.handleQuery(newValue)
}, { immediate: true })

watch(() => taxonomyStore.currentTaxon, async (newValue) => {
    itemStore.setSearchFormField('taxon_lineage', newValue?.taxid)
    await itemStore.fetchItems(props.model)
})


</script>

<style lang="scss" scoped>
.content-section {
    margin: 0 auto;
    padding: 0 1rem;
}

.filters-section {
    margin-bottom: 0.75rem;
}

.data-card {
    background: var(--va-background-secondary);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    transition: box-shadow 0.2s, transform 0.2s;

    &:hover {
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.10);
    }
}

@media (max-width: 768px) {
    .filters-section {
        margin-bottom: 0.5rem;
    }
}
</style>