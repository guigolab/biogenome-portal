<template>
    <div class="row">
        <div class="flex">
            <VaButton @click="itemStore.showFilters = !itemStore.showFilters" color="secondary" preset="primary">{{
                showFiltersLabel }}</VaButton>
        </div>
    </div>
    <div v-if="itemStore.parentTaxon">
        <VaCard>
            <VaCardTitle>
                selected taxon
            </VaCardTitle>
            <VaCardContent>
                <span class="va-h6">{{ itemStore.parentTaxon.name }}</span>
                <WikiSummary :name="itemStore.parentTaxon.name" :rank="itemStore.parentTaxon.rank" />
            </VaCardContent>
            <VaDivider/>
            <VaCardContent>
                <Breadcrumbs :taxid="itemStore.parentTaxon.taxid" />

            </VaCardContent>
        </VaCard>
        <VaDivider />
    </div>
    <div class="content-row">
        <div :class="['tree-container', { 'hidden': !taxonomyStore.showTree }]">
            <h3 class="va-h3">Taxonomy Tree</h3>
            <D3HyperTree />
        </div>
        <div :class="['content-container', { 'full-width': !taxonomyStore.showTree }]">
            <div v-if="config">
                <h1 v-if="config.title" class="va-h3">{{ config.title[locale] }}</h1>
                <p class="light-paragraph mb-6" v-if="config.description">{{
                    config.description[locale] }}</p>
            </div>
            <FiltersBlock :model="currentModel" :hasCharts="hasCharts" />
            <ActiveFiltersBlock :model="currentModel" />
            <ChartsBlock :source="currentModel" :charts="charts" v-if="itemStore.view === 'charts'" />
            <TableBlock :model="currentModel" v-else />
        </div>
    </div>
    <ExportTSV :model="currentModel" />
    <CreateChart :model="currentModel" />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { computed, watch } from 'vue'
import { DataModels, ModelConfig } from '../../data/types'
import { useRoute } from 'vue-router'
import { useItemStore } from '../../stores/items-store'
import ChartsBlock from '../../components/blocks/ChartsBlock.vue'
import FiltersBlock from '../../components/blocks/FiltersBlock.vue'
import TableBlock from '../../components/blocks/TableBlock.vue'
import { useConfig } from '../../composable/useConfig'
import { useStatsStore } from '../../stores/stats-store'
import ActiveFiltersBlock from '../../components/blocks/ActiveFiltersBlock.vue'
import ExportTSV from '../../components/modals/ExportTSV.vue'
import CreateChart from '../../components/modals/CreateChart.vue'
import D3HyperTree from '../../components/tree/D3HyperTree.vue'
import { useTaxonomyStore } from '../../stores/taxonomy-store'
import WikiSummary from '../taxonomy/components/WikiSummary.vue'
import Breadcrumbs from '../../components/breadcrumbs/Breadcrumbs.vue'

const showFiltersLabel = computed(() => itemStore.showFilters ? 'hide Filters' : 'show Filters')
const props = defineProps<{
    config?: ModelConfig,
    model?: DataModels
}>()

const { locale } = useI18n()
const route = useRoute()
const itemStore = useItemStore()
const taxonomyStore = useTaxonomyStore()
const statsStore = useStatsStore()

const currentModel = computed(() => {
    return props.model || route.name as DataModels
})

const total = computed(() => {
    const v = statsStore.currentStats.find(s => s.key === currentModel.value)
    return v ? v.count : 0
})

const charts = computed(() => {
    const { charts } = useConfig(currentModel.value)
    return charts.value
})

const hasCharts = computed(() => charts.value.length > 0)

watch(() => currentModel.value, async () => {
    await itemStore.handleQuery(currentModel.value)
}, { immediate: true })



</script>
<style lang="scss">
.content-row {
    display: flex;
    flex-wrap: wrap;
    min-width: 0;
    width: 100%;
    flex-direction: row;
}

/* Tree container, initially hidden */
.tree-container {
    flex: 0 0 50%;
    /* Occupies 50% of the width */
    max-width: 50%;
    transition: all 0.7s ease;
    overflow: hidden;
    transform: translateX(0);
    /* Starts in view */
}

.tree-container.hidden {
    flex: 0 0 0%;
    /* Shrinks to 0% width */
    max-width: 0;
    transform: translateX(-100%);
    /* Slides out of view */
}

/* Content container transitions smoothly */
.content-container {
    flex: 1;
    max-width: 50%;
    /* Occupies remaining space */
    transition: all 0.7s ease;
}

.content-container.full-width {
    flex: 1 1 100%;
    /* Takes full width when tree is hidden */
    max-width: 100%;
}

/* Responsive design for mobile and tablets */
@media (max-width: 820px) {

    .tree-container,
    .content-container {
        flex: 0 0 100%;
        /* Take 100% of the width on small screens */
        max-width: 100%;
        transform: translateX(0);
        /* Reset any transform applied */
    }

    .tree-container.hidden {
        display: none;
        /* Hide the tree container completely when toggled off */
    }
}

@media (max-width: 480px) {

    .tree-container,
    .content-container {
        flex: 0 0 100%;
        /* Take 100% of the width on small screens */
        max-width: 100%;
        transform: translateX(0);
        /* Reset any transform applied */
    }

    .tree-container.hidden {
        display: none;
        /* Hide the tree container completely when toggled off */
    }
}
</style>